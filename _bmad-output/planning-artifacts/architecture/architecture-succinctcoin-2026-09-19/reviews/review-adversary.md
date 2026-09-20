# Architecture Spine Review — Adversary Lens

**Spine under review:** `ARCHITECTURE-SPINE.md` (architecture-succinctcoin-2026-09-19)
**Lens:** Adversary — construct two units one level below the spine that each obey every AD *to the letter* yet build incompatibly.
**Method:** grounded in the real code under `src/` (brownfield), plus two empirical probes of `Crypto.hash` semantics.
**Date:** 2026-09-20

---

## Verdict

## **FAIL**

The spine is a strong *layering* and *authority* contract (headless core, symmetric network, bootstrap-only root/discovery, one composition root, one config owner, core-throws/app-maps). As a statement of **which nodes may do what**, it is sound.

As a **consensus build-substrate**, it fails. It pins the *algorithm* (sha512 over sorted JSON, ECDSA via noble) and the *authority* rules, but it does **not** pin the *consensus state machine*: it never specifies the state-transition function, never requires validity to be a pure function of chain contents, defers the entire miner-selection rule, and leaves the block-hash input set and intra-block ordering free. Two builders can implement units that obey every AD to the letter and still produce chains that do not interoperate. Five findings below are of that kind; the top two are consensus-safety breaks, not drift hazards.

**Empirical probes run (for the record):**
- `Crypto.hash(a,b) === Crypto.hash(b,a)` for two scalar inputs → **true**. The sort in `Crypto.hash` nullifies *argument order* (defends one half of the lottery attack, fails to defend encoding).
- `Crypto.hash(prevHash, pubkeyHexString) !== Crypto.hash(prevHash, pubkeyRawBytes)` → **true**. Hex-string vs raw-byte encoding of the same key diverges (lottery input encoding is genuinely under-specified).
- `Crypto.hash(...,[txWithBig]) === Crypto.hash(...,[txAfterJSONRoundTrip])` → **true**. Big.js vs JSON-wire serialization is stable *by accident* (both stringify to `"50"`), not by declaration.

---

## Successful attacks

### A-1 · CRITICAL — No state-transition function; validity is a function of *local on-disk* account state

**The gap.** The spine's consensus rule (AD-2) is defined entirely over *chain validity* and *length*: "the candidate chain must be fully valid and strictly longer." "Valid" is therefore whatever the code's validator says. But the validator is **not a pure function of the chain** — it reads each node's own on-disk account files.

`src/main/blockchain/transaction.js` → `validate()`:
```js
const senderAccount = await new Account({ publicKey: this.sender }).retrieve()   // reads LOCAL DISK
...
if (Big(this.amount).plus(this.fee).gt(senderAccount.balance) ...) throw new Error('Amount exceeds balance')
```
`Account` is wrapped in `Obj2fsHOC` and keyed by `STORE.ACCOUNTS / Crypto.hash(publicKey)`; `.retrieve()` reads that file. The balance in that file is initialized to `STARTING_BALANCE = 0` (`src/main/config.js`) and **is never written by any production code path**: `addBalance` / `subtractBalance` / `addStake` / `subtractStake` (and the `calculateBalance()` `TODO: to implement`) appear *only* in `src/main/blockchain/account.js` (definitions) and `account.test.js` (tests). Nothing in the mine/validate/`replaceChain` path ever applies a block's transactions to account state.

Consequences:
1. **Validity is node-relative, not absolute.** A transaction is valid on a node whose local disk shows the sender as rich, and invalid on a node whose disk shows the sender as broke (or where the sender's account file doesn't exist → `.retrieve()` throws → invalid). `Block.validate()` → `tx.validate()`, `Blockchain.isValidChain` → `block.validate()`, `replaceChain` → `isValidChain`. So two honest nodes can **disagree on whether the same chain is valid**. AD-2's "longer *valid* chain wins" presupposes "valid" is agreed; it is not. This is a consensus-safety break, not a liveness quirk.
2. **The economic layer is never wired into consensus.** No AD or convention states that a valid block *mutates* account state. "The block reward goes to the miner of the accepted block" (AD-3) is declared settled, but the mechanism (a transition crediting the miner, debiting senders, locking stake) is absent from both the code and the spine.
3. **Latent dead-end the spine ratifies.** Because every on-disk balance is 0 and never changes, *every user transaction* fails `Amount exceeds balance` on *every* node (only reward txs skip the balance check via the `recipient !== REWARD_ADDRESS` guard). The chain can therefore only ever contain reward-only blocks, which `block.js` rejects at height > 3 ("Empty data"). The system can never grow past height 3. The spine lists none of this as deferred.

**Behaviors.**
- **Builder A** implements a real state-transition function: on block acceptance it derives a *chain-derived* account state (replay txs over the chain) and validates each tx against the balance *implied by the chain*, never against local disk.
- **Builder B** keeps the ratifled brownfield: `tx.validate()` reads the sender's *local on-disk* balance, and blocks never mutate accounts.

**Why both obey every AD.** No AD names a state-transition function, and no AD requires validity to be a pure function of chain contents. AD-2 says "fully valid" — "valid" is delegated to the validator, and the validator (as written) is local-state-dependent. AD-3 says the reward "goes to the miner" and that stake "gates nothing"; both are true in B whether or not balances are ever moved. AD-1 (headless core) is satisfied by both (disk I/O to the core's own store is explicitly allowed). The conventions pin money/hash/lifecycle but never pin *state transition*. So A and B each obey every AD to the letter.

**The incompatibility.** A's chain is valid on A's nodes and *invalid* on B's nodes (and vice-versa), so `replaceChain` on either side rejects the other's longer chain. No convergence. In A, rewards/stakes actually move; in B, they never do and no user tx is ever accepted. Same ADs, two mutually-hostile consensus implementations.

**Concrete fix.**
- **New AD-10 — Deterministic state-transition function.** "A valid block's transactions are applied to account state that is **derived from the chain alone** (replay over the accepted chain); validation MUST be a pure function of chain contents and MUST NOT read local mutable on-disk account state as an input. Account balances/stakes are computed, never stored as a consensus input." Bind: `blockchain-core`, `transaction-system`, `account-management`.
- Amend the **Hashing & signing / Transaction lifecycle** conventions to add a row: **State transition** — "exactly one deterministic function `apply(block, state) → state'` lives in the core; `tx.validate()` takes the chain-derived sender balance as an argument, not a disk read."
- Move the current brownfield gap into **Deferred** explicitly as a *follow-up change that must precede any network launch* (it is a correctness prerequisite, not a nicety).

---

### A-2 · CRITICAL — The entire miner-lottery rule (variant **and** input encoding) is deferred, yet it is the consensus primitive

**The gap.** AD-4 declares "the miner of block *h+1* is a deterministic pure function of (block *h* hash, candidate node public key)." That is the *contract*; the *function* is explicitly punted:

> **Deferred:** "Exact miner-lottery mapping (fixed-odds threshold on `hash(pubkey, prevHash)` vs argmin over known peers) … both variants satisfy the AD."

The spine treats this as "spec detail." It is not spec detail — it is **the** rule that decides which node appends the next block, and it is the input to the next block's hash (the `lastHash`), so it is the engine of the whole chain. Two deferred variants are **not interchangeable**:
- **Variant A (fixed-odds threshold):** each node *self-evaluates* `hash(pubkey, prevHash)` against a threshold. Multiple nodes can each independently compute "I won" for the same *h* (there is no global uniqueness), producing competing blocks at the same height.
- **Variant B (argmin over known peers):** selection is a *global* ordering over the set of known peer public keys — a fundamentally different computation that requires peer-set knowledge and yields a single winner.

**Encoding is also free.** Even inside a single variant, the spine never fixes *how* the public key and block hash are encoded into the hash. Empirically: `Crypto.hash(prevHash, "02aa…")` (hex string, the current wallet convention — `Wallet.publicKey` is a hex string) ≠ `Crypto.hash(prevHash, Uint8Array(0x02aa…))` (raw bytes). Both are "a public key" and both feed "a pure function of (block h hash, pubkey)." The *ordering* of the two inputs is, however, **defended**: `Crypto.hash` sorts its JSON inputs (`src/main/util/crypto.js:7-11`), so `hash(pubkey, prevHash) === hash(prevHash, pubkey)` for two scalars — confirmed by probe. So the sort accidentally kills the *order* attack but not the *encoding* attack.

**Behaviors.**
- **Builder A** implements fixed-odds on `hash(prevHash, pubkeyHexString)`, self-evaluated.
- **Builder B** implements argmin over known peers on `hash(prevHash, pubkeyRawBytes)`, peer-set based.

**Why both obey every AD.** AD-4's letter is satisfied by *any* deterministic pure function of (block h hash, pubkey) that every peer can compute — both are. The spine *explicitly* asserts "both variants satisfy the AD." AD-1 is satisfied (the selection function lives in the core). AD-3 is satisfied (no hardware/stake input). The encoding is unconstrained by any AD or convention — the conventions say "sha512 over sorted JSON inputs" but never say which *form* (hex string vs bytes) a public key takes as a lottery input.

**The incompatibility.** A and B select **different miners for the same block h+1**. The network splits into A-build nodes and B-build nodes that each extend their own head; neither fork's blocks are "the" next block for the other. Because the winner's identity changes the block's `miner` field, `timestamp`, and hence `hash` (→ next `lastHash` → next lottery input), the divergence compounds every height. This is a hard partition, not a transient fork.

**Concrete fix.**
- **Remove the lottery mapping from Deferred.** It is a consensus rule, not a detail. Either adopt it in the spine now or, at minimum, pin the *envelope* that any future variant must satisfy:
  - **New convention row — Lottery input canonical form:** "The lottery function's inputs are canonically `prevBlockHash` (hex string) and `nodePublicKey` (hex string, uncompressed `04…` form); both are passed as *hex strings* to `Crypto.hash`, never as raw bytes. Argument order is immaterial (sorted by `Crypto.hash`)."
  - **New AD-11 — Single-winner or explicit fork rule:** state whether the lottery guarantees at most one winner per height (then no tie-break is needed) or allows multiple (then it must cite the A-5/A-6 tie-break). The two deferred variants are mutually exclusive — pick the family now.
- Amend **AD-4** to reference the new AD-11 and the input-canonical-form row, so a future OpenSpec change implements a *fixed* rule rather than a free choice.

---

### A-3 · HIGH — Intra-block transaction ordering is not canonically fixed; it is a hash input

**The gap.** The block hash includes the transaction list: `block.js` `mineBlock()` computes `Crypto.hash(this.height, this.uuid, this.timestamp, this.miner, this.lastHash, this.data)`. The conventions pin the *outer* algorithm ("sha512 over sorted JSON inputs"), but `Crypto.hash`'s sort applies to the **six top-level inputs**, not to the elements *inside* `this.data`. So the *order of transactions within the block* is a consensus input that the spine never fixes.

Where that order comes from today is non-deterministic in two compounding ways:
1. `transaction-pool.js` `validTransactions()` returns `Object.values(this.transactionMap)` filtered by validity. Keys are tx `uuid`s (non-integer-like strings), so `Object.values` order is **insertion order = network-arrival order** of gossiped txs — different on every node.
2. `block.js` then `this.data.sort((a, b) => (a.timestamp >= b.timestamp ? 1 : -1))`. For two txs with the **same timestamp** (same millisecond — common, and *guaranteed* for the reward tx whose timestamp is set to the block timestamp), the comparator returns `1` for *both* `compare(a,b)` and `compare(b,a)` — an **inconsistent** comparator that violates antisymmetry. V8's TimSort with an inconsistent comparator yields an **implementation-defined** order. So even after the sort, equal-timestamp txs are ordered non-deterministically across builds/V8 versions.

**Behaviors.**
- **Builder A** builds `data` from `Object.values(map)` (arrival order) and sorts by the current (inconsistent) timestamp comparator.
- **Builder B** builds `data` then sorts by a **deterministic total order** `(timestamp, uuid)`.

**Why both obey every AD.** No AD or convention states that the intra-block tx order is a consensus input, or that it must be a canonical total order. The lifecycle convention says txs are "immutable after signing" and the Hashing convention says "sorted JSON inputs" — neither constrains the *order of elements inside the `data` array*. AD-2 only requires the resulting chain to be "valid," and `block.validate()` checks that `data` is *some* timestamp-ascending order (its own `Invalid sort order` loop only rejects a *descending* pair, not a tie ordering). So both A's and B's blocks validate. Both obey.

**The incompatibility.** For any block containing ≥ 2 txs with equal timestamps (the reward tx always shares the block timestamp, so this is *every* block with a user tx), A and B produce **different `data` arrays → different block `hash` → different `lastHash` for the next block → different lottery input → divergent miner selection (A-2) → permanent fork.** The ordering is a consensus input the spine left free.

**Concrete fix.**
- **New convention row — Canonical block contents:** "A block's `data` array is the multiset of its transactions sorted by the deterministic total order `(timestamp ASC, uuid ASC)`. This order is a consensus input: it is part of the block hash."
- Amend **block.js** (follow-up change) to replace the inconsistent comparator with `(a.timestamp - b.timestamp) || a.uuid.localeCompare(b.uuid)`.
- Amend the **Hashing & signing** convention to explicitly list the block-hash field set (see A-4) and note that `data` is hashed *as an ordered array*.

---

### A-4 · HIGH — The block-hash input field set is not pinned; only the algorithm is

**The gap.** The conventions say "Hashing & signing: `Crypto.hash` = sha512 over sorted JSON inputs, hex-encoded." That pins the *algorithm*, not the **set of fields** that constitute "block contents." The current code hashes exactly `[height, uuid, timestamp, miner, lastHash, data]` (`block.js` `mineBlock`), but the spine never *declares* that set as canonical. A builder implementing from the spine (or refactoring it) could hash `[height, uuid, timestamp, miner, lastHash, data, signature]`, omit `uuid`, include the storage `key`, or fold `miner` differently — all of which are "sha512 over sorted JSON inputs."

**Behaviors.**
- **Builder A** hashes the six code fields.
- **Builder B** hashes six fields but *also* includes `signature` (arguing "the signature is part of the block"), or *omits* `uuid`.

**Why both obey every AD.** The Hashing convention is algorithm-only. The spec's "Block mining" says "computing a SHA512 hash of block contents" — "contents" is undefined. No AD enumerates the block-hash field list. Both A and B use `Crypto.hash` (sorted JSON, sha512, hex) exactly as the convention prescribes.

**The incompatibility.** Different field sets → different block `hash` → different `signature` (which is over the hash) → different `lastHash` for every subsequent block. Two builds produce **mutually-invalid chains from the very first mined block**, and `block.validate()` (which recomputes the hash over the *local* field set) rejects the other's blocks as `Invalid hash`. Total non-interoperability.

**Concrete fix.**
- **Amend the Hashing & signing convention** to enumerate the canonical block-hash inputs: "`Crypto.hash(height, uuid, timestamp, miner, lastHash, data)` — exactly these six, in this set; `data` is the ordered array per the Canonical block contents row (A-3). Adding or removing a field is a consensus-breaking change and is forbidden without a hard fork."
- Add the same enumeration for the **transaction-signature** inputs (the 6-field array in `wallet.transactionSignature`) so the tx-hash field set is pinned too (it currently is only in code).

---

### A-5 · HIGH — Root pool sync is ungated: AD-5/AD-2 gate the *chain* but not the *pool*

**The gap.** AD-5: "the configured root is consulted only to seed an **empty** local chain/pool at startup." The *chain* half is protected by AD-2 — `syncWithRootState` applies root's chain via `blockchain.replaceChain`, which enforces strictly-longer + valid. So for the chain, an unconditional root re-fetch is neutralized: root's chain only wins if it's strictly longer and valid. **The pool half is not protected.** `src/main/api.js` `syncWithRootState()`:
```js
fetch(`${root}/api/transaction-pool-map`)...
  .then(json => { transactionPool.setMap(rootTransactionPoolMap) })   // FULL REPLACE, no gate
```
`setMap` is an **unconditional full replace** of the local pool. It is not gated on the local pool being empty, not a merge, and not subject to any AD-2-equivalent validity/length rule (AD-2 governs `replaceChain` only). So a builder that "re-fetches from root at startup whenever it responds fast" — i.e., the *current code* — gives root **standing authority to overwrite the entire local transaction pool on every startup**, discarding locally-gossiped-but-unmined txs and substituting root's set. The pool determines the next block's contents, so this is consensus-relevant, and it is precisely the "root as standing authority" posture AD-5's *Prevents* clause exists to forbid.

**Behaviors.**
- **Builder A** gates *both* chain and pool on emptiness: root populates the pool only when the local pool is empty; otherwise it's a union/merge.
- **Builder B** (current code) calls `syncWithRootState` whenever root responds, doing `replaceChain` (gated) + `setMap` (ungated full replace).

**Why both "claim" AD-5 compliance.** AD-5's operative verb is "*consulted* … at startup." B *consults* the root at startup and applies the result — literally what AD-5 permits. The AD never states "the pool must be empty to accept root's map" as a **checkable predicate**, never says pool sync is a merge vs. replace, and never extends AD-2's gate to the pool. So B can read "consulted at startup → `syncWithRootState` → `setMap`" (the exact shipped code) as compliant, and the spine's own **Deferred** row even blesses the current unconditional code: "the rule is settled (AD-5); making the code match it is a follow-up." A reads "seed an *empty* pool" as conditional on emptiness. Both are defensible readings of the same text.

**The incompatibility.** After a restart with a fast root, B's pool is whatever root had; A's pool is its own gossiped set. They mine different blocks from different pool contents at the next height → divergent blocks → fork. Worse, B's design lets a (malicious or stale) root dictate what the network's nodes will mine, a standing-authority leak AD-5's *Prevents* targets but its *Rule* text doesn't close.

**Concrete fix.**
- **Amend AD-5** to make the emptiness a hard, checkable predicate and to cover the pool: "The root may populate the local **pool** only when the local pool is empty; pool sync from root is a **union/merge, never a full replace**; a non-empty local pool is never overwritten by root. The chain half remains governed by AD-2 (strictly-longer valid)."
- Add a **Consistency Convention** row: **Pool sync** — "root/peer pool ingestion is additive (merge by `uuid`); full `setMap` from a remote is prohibited outside the empty-pool bootstrap."
- Move the current `setMap` in `syncWithRootState` into **Deferred** as a *known AD-5 violation to fix before network launch*, not a neutral follow-up.

---

### A-6 · MEDIUM — Equal-length fork tie-break is unspecified

**The gap.** AD-2: "strictly longer, otherwise rejected"; spec: "shorter or **equal** length → remain unchanged." So equal-length candidate chains are *always rejected*. This is a legitimate, convergent rule *in principle* (the same "longer wins" that makes PoW converge: a transient equal-length fork resolves when one side appends the next block and becomes strictly longer). But the spine never states (a) the **convergence argument**, or (b) **which equal-length head a node treats as its build-on tip when it holds two** (e.g., first-received vs. `min(hash)`). Because the lottery hashes the block tip (A-2), a node's build-on tip *is* the next lottery's `prevHash` input — so an unspecified tip choice feeds directly into unspecified miner selection.

**Behaviors.**
- **Builder A** keeps the *first-received* equal-length chain as its head.
- **Builder B** keeps the `min(hash)` of competing equal-length chains as its head.

**Why both obey AD-2.** Both reject equal-length *incoming* chains (as required) and both build on *a* local head. AD-2's letter is only about the *replace* decision, not about *which local head to build on* when the node already holds two. Both obey.

**The incompatibility.** A and B pick different build-on tips at the equal-length boundary → different `prevHash` → different lottery input → different next miner (A-2) → longer-lived, more frequent forks. This is a **liveness** gap (transient, converges by length), not a safety break — but it is real, it is unspecified, and it *amplifies* A-2/A-3.

**Concrete fix.**
- **Amend AD-2** to add the tie-break and the convergence note: "When a node holds two valid chains of equal length, it builds on the one with the **lower block hash at the divergence point** (deterministic). Equal-length *incoming* chains are still rejected (no replace); convergence is by strictly-longer extension."
- Add a **Deferred/Conventions** note that this tie-break must be identical on all nodes (it is a consensus input, like A-2/A-3).

---

### A-7 · MEDIUM — The lottery re-check interval's config ownership is ambiguous (AD-8)

**The gap.** AD-4: nodes re-evaluate the lottery "on an interval (natural value: `VALIDATION_RATE`, 1000 ms)." AD-8's core-config list includes "**validation rate**." `VALIDATION_RATE` *is* defined in core config (`src/main/config.js`, "how often to generate a block"). But the **mining re-check interval** is a *liveness* parameter — it does not affect *which* node wins (the lottery is a pure function of block h hash + pubkey), only *when* a node looks. So conceptually it is **app-semantic**, not chain-semantic. The spine aliases the two ("natural value: VALIDATION_RATE") without ever saying they are the *same* value or *different* values.

**Behaviors.**
- **Builder A** reads the re-check interval from core `VALIDATION_RATE` (treating it as the chain value, per AD-8's list).
- **Builder B** defines an app-level `MINING_INTERVAL` in `src/config.js` (treating the cadence as app-semantic liveness).

**Why both obey AD-8.** AD-8 says "one owner per config value" and lists "validation rate" under core. If the interval *is* "validation rate," B (app-owned) violates the letter; if the interval is a *distinct* liveness value that merely defaults to the same number, then B owning it at app level is correct and A *conflating* it with `VALIDATION_RATE` is the error. The spine never disambiguates, so each builder can point to a different half of AD-8/AD-4 to justify its choice.

**The incompatibility.** A config/ownership divergence (the exact dual-owner drift AD-8 exists to prevent): a change to core `VALIDATION_RATE` moves the mining cadence in A but not in B, and vice-versa. Not a consensus break (interval ≠ consensus input), but a maintainability/drift hazard and a direct AD-8 intent violation for one of the two builds.

**Concrete fix.**
- **Amend AD-8** to classify explicitly: "**Lottery re-check interval** is **app-semantic** (liveness; owned by app config `src/config.js`). It is a *distinct* value from `VALIDATION_RATE` (a core/chain value); if they default to the same number, that is a coincidence, not an alias. Each has exactly one owner."
- Add the interval to the app-config seed and remove the "(natural value: VALIDATION_RATE)" alias from AD-4, or make the alias explicit and single-owned.

---

### A-8 · MEDIUM — Error → status / IPC shape mapping is unspecified (AD-9)

**The gap.** AD-9: "core throws; the app layer catches and maps to HTTP status codes or IPC responses, and owns all logging and user-facing messages." It fixes the *direction* (core throws, app maps) but **not the mapping** (which error → which status) nor the **response envelope** (shape). The current code maps *all* `/api/transact` failures to `400` with `{ type: 'error', message: error.message }`, but nothing in the spine says that's canonical.

**Behaviors.**
- **Builder A** maps `Duplicate transactions`→`409`, `Amount exceeds balance`→`402`, `Invalid hash`→`400`, unknown→`500`; IPC shape `{ code: <stable>, message }`.
- **Builder B** maps every validation error→`400`; IPC shape `{ type: 'error', message }` (current code).

**Why both obey AD-9.** Both have the core throw and the app map. AD-9's letter is the *layering* of errors, not the *table*. Both comply.

**The incompatibility.** The core (the throwing side) is identical in both — so this is not a consensus break. But the **HTTP API is a public contract** (other nodes/clients call `/api/transact`, `/api/blocks`), and the **IPC shape is a renderer contract**. A and B present *different error contracts* to the network and to the UI. A client/renderer built against A's contract (expecting `409` on duplicate) misbehaves against B (`400`). Divergence at the public boundary, self-consistent only within a single build.

**Concrete fix.**
- **Amend AD-9** (or add a convention row) to fix the canonical table + envelope: "Canonical error envelope `{ type: 'error', code: <stable string>, message }`; canonical status map: `Duplicate transactions`→409, insufficient-balance→402, invalid-hash/signature→400, unexpected→500. HTTP and IPC MUST use the same envelope and the same `code`."

---

### A-9 · LOW — The renderer preload-bridge *shape* is unspecified (AD-8)

**The gap.** AD-8: "The renderer imports no config file directly — it receives UI values (API port) via the preload bridge." It fixes the *channel* (preload) but not the *shape*. The current `src/renderer/preload.js` exposes `send`/`sendSync`/`receive` over a channel whitelist and **does not expose the port at all** (the port is a Deferred "later OpenSpec change"). So the bridge's API is a target state with no pinned contract.

**Behaviors.**
- **Builder A** preload exposes `window.electronAPI.getApiPort()` (synchronous pull, returns the port).
- **Builder B** preload pushes `window.apiPort = <port>` on load (eager push).

**Why both obey AD-8.** Both deliver the UI value "via the preload bridge" and both keep the renderer from importing config directly. AD-8's letter is the *no-direct-import* rule, not the method shape. Both comply.

**The incompatibility.** Renderer code written against A's contract (`getApiPort()`) breaks against B's preload (no such method), and vice-versa. Low severity because renderer + preload are always built together in one repo (each build is internally self-consistent); the risk is contract drift if the bridge API is ever consumed across a build boundary or written before the contract is pinned.

**Concrete fix.**
- **Amend AD-8** (or add a convention row) to pin the contract: "The preload bridge exposes exactly `window.electronAPI.getApiPort(): number` (synchronous). This is the sole renderer→app config surface."

---

## Failed attacks (defended)

- **Lottery input *ordering* (`hash(pubkey, prevHash)` vs `hash(prevHash, pubkey)`).** **Defended — by the sort.** `Crypto.hash` does `inputs.map(JSON.stringify).sort().join(' ')` (`src/main/util/crypto.js:7-11`), so for two scalar inputs argument order does not change the digest (confirmed by probe). *Caveat:* this defense is accidental and only holds for scalars; it does **not** defend the *encoding* attack (A-2) or the *intra-array* ordering (A-3). The sort is load-bearing and should be declared, not left implicit.
- **In-memory Big.js vs JSON-wire amount/fee serialization.** **Defended — by accident.** `JSON.stringify(Big(50)) === '"50"'` and `JSON.stringify("50") === '"50"'`, so a tx hashed in-process and the same tx after a gossip JSON round-trip produce the **same** block hash (confirmed by probe). *Caveat:* this stability is undeclared and fragile (it holds because both forms stringify to the same string); it is subsumed by A-3/A-4 and should be pinned by the canonical-content conventions.
- **Genesis identity.** **Defended.** `Blockchain.isValidChain` requires `JSON.stringify(chain[0]) === JSON.stringify(Block.genesis())` — an *exact* object match against `GENESIS_DATA`, which AD-8 places in core config and the spec pins field-by-field (height 0, `uuid="GENESIS"`, etc.). No A/B reading yields two different accepted geneses.
- **Signature verification path.** **Defended (modulo A-4).** The convention + code pin the path: sign over `sha512` of canonical inputs; block signature over the block hash, tx signature over the tx field array; verify re-hashes. A and B both use `Crypto.hash`/noble identically. The only residual freedom is the *field set* (A-4), not the *path*.
- **Reward-transaction shape.** **Defended by ratification.** Code + spec pin it: exactly one reward tx per block, `fee=0`, `amount=REWARD_AMOUNT`, `recipient=REWARD_ADDRESS`, timestamp anchored to the block, signature valid. *Residual:* its *application* to balances is missing — but that is A-1 (state transition), not a shape A/B.
- **Root *chain* sync authority.** **Defended by AD-2.** Root's *chain* is applied via `replaceChain` (strictly-longer + valid), so an unconditional root chain re-fetch cannot impose a shorter/equal/invalid chain. (The *pool* half is **not** defended — see A-5.)

---

## Summary

| # | Severity | Finding | One-line |
|---|----------|---------|----------|
| A-1 | **CRITICAL** | No state-transition; validity reads local on-disk balances | Validity is node-relative, not a pure function of the chain → nodes disagree on "valid," no convergence, rewards/stakes never applied, chain can't pass height 3 |
| A-2 | **CRITICAL** | Lottery variant + input encoding fully deferred | The consensus primitive (who mines h+1) is a free choice → two builds select different miners, hard partition |
| A-3 | HIGH | Intra-block tx ordering not canonical, and it's a hash input | Non-deterministic map order + inconsistent timestamp sort (ties) → different block hash → divergent next lottery |
| A-4 | HIGH | Block-hash field set not pinned (algorithm only) | Two builds hash different field sets → different hash/signature/lastHash → mutually-invalid chains from block 1 |
| A-5 | HIGH | Root pool sync ungated (chain gated, pool not) | `setMap` full replace on every startup gives root standing pool authority; A (empty-gated) vs B (current code) both claim AD-5 |
| A-6 | MEDIUM | Equal-length fork tie-break unspecified | No deterministic build-on tip at equal length → feeds lottery divergence; liveness gap |
| A-7 | MEDIUM | Mining-check interval ownership ambiguous | Core `VALIDATION_RATE` vs app `MINING_INTERVAL` — dual-owner drift AD-8 exists to prevent |
| A-8 | MEDIUM | Error→status/shape mapping unspecified | Public HTTP + IPC error contracts diverge between builds |
| A-9 | LOW | Preload-bridge shape unspecified | `getApiPort()` vs push — contract not pinned (single-repo, self-consistent) |

The spine's authority and layering decisions hold up under attack. Its consensus decisions do not: it ratifies a validator whose "valid" is impure (A-1) and defers/leaves-free the three things that actually make blocks interoperate — who mines (A-2), what order the txs go in (A-3), and which fields get hashed (A-4). **Verdict: FAIL** — A-1 and A-2 are consensus-safety breaks that must be closed (new ADs) before this spine can serve as a build-substrate for a multi-node network.
