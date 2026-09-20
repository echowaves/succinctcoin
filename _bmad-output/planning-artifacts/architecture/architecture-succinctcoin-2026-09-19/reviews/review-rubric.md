# Rubric Review — Architecture Spine (SuccinctCoin)

- **Spine:** `ARCHITECTURE-SPINE.md` (2026-09-19, draft)
- **Reviewer role:** rubric walker (research + judgment; spine not modified)
- **Evidence base:** spine; run `.memlog.md`; OpenSpec specs (blockchain-core, p2p-networking, transaction-miner, api-endpoints, configuration, wallet, account-management, transaction-system, crypto-utils, electron-app, renderer-ui, build-tooling); code (`src/main/api.js`, `src/main/index.js`, `src/main/blockchain/{index,block,transaction,transaction-pool,wallet,account}.js`, `src/main/app/{pubsub,transaction-miner}.js`, `src/main/util/crypto.js`, `src/main/config.js`, `src/config.js`, `src/renderer/preload.js`, `webpack.main.config.js`); versions verified live against `node_modules` and `node -v`.

## Verdict

**PASS-WITH-FINDINGS**

The spine settles the load-bearing calls (headless core, symmetric consensus, no purchasable privilege, per-block lottery, root/discovery bootstrap-only, composition root, config ownership, error flow) and ratifies the brownfield shape correctly. However, three ADs silently contradict canonical specs or current code without being marked as target-state (checklist 5), one deferred item carries a consensus-fork risk that the AD doesn't constrain (checklist 3), and the Operational Envelope paragraph leaves key custody and parts of the operational matrix undecided (checklist 8).

---

## Findings

### F1 — HIGH — AD-4 vs transaction-miner spec (and api-endpoints spec) contradiction, not marked target-state
- **Location:** Spine §AD-4; `openspec/specs/transaction-miner/spec.md` ("Transaction mining" — mining happens when `mineTransactions()` is called, i.e., via `GET /api/mine-transactions` per api-endpoints spec "Mine transactions"); `src/main/app/transaction-miner.js` (no interval loop exists; `VALIDATION_RATE` is defined in `src/main/config.js` but referenced nowhere).
- **Problem:** AD-4 asserts "Mining is autonomous: each node evaluates the lottery against its current head on an interval… The HTTP mine endpoint is a dev convenience, not the mining path." This contradicts the canonical spec, where HTTP-triggered mining *is* the mining path, and contradicts current code (no autonomous loop). AD-4 is written as present-tent design truth, not marked target-state (checklist 5). A builder at the level below will either implement the autonomous loop (violating the spec as written) or follow the spec (violating the AD).
- **Fix:** Mark AD-4 as a **target-state** AD (it is a new decision, not a ratification). Add to Deferred: "Rewrite transaction-miner spec (and the api-endpoints 'Mine transactions' requirement) to the autonomous-lottery model when implementing AD-4; demote `/api/mine-transactions` to dev convenience in the same change."

### F2 — HIGH — AD-5 rule vs p2p-networking "Chain-sync precedence" spec contradiction, under-described
- **Location:** Spine §AD-5 (Rule: root "is consulted only to seed an **empty** local chain/pool at startup"); `openspec/specs/p2p-networking/spec.md` → "Chain-sync precedence" ("the node SHALL treat the received chain as the authoritative root and initialize the local chain from it **before applying any peer replaceChain()**", "the peer chain SHALL NOT be accepted directly; the node SHALL first sync the authoritative root").
- **Problem:** The spec's precedence is not scoped to empty chains: it mandates root-first ordering on *any* incoming chain while the local chain is empty, and frames root as authoritative at initialization — while AD-5 settles root as bootstrap-for-empty-only and explicitly demotes it. AD-5's "Prevents" line says the spec is "read through this AD", which is an interpretive override of canonical spec text without being recorded as a spec-conflict to resolve. The Deferred entry ("Enforcing root-sync precedence in code") only covers the *code* gap (no empty-chain guard in `syncWithRootState`, `src/main/api.js`), not the spec-vs-AD wording conflict. A level-below agent reading the spec will implement a root-first guard broader than AD-5 intends (checklists 1 and 5).
- **Fix:** In AD-5, explicitly record that "Chain-sync precedence" must be rewritten (empty-chain-only scope, no standing authority) as part of the root-sync follow-up, and fold the spec-rewrite into the existing Deferred row. Alternatively restate the AD rule to match the spec's dev-mode empty-chain scenarios verbatim so code and spec converge on one reading.

### F3 — MEDIUM — Deferred lottery-mapping variants are not equivalent; AD-4 doesn't constrain the winner
- **Location:** Spine §AD-4 (Rule) and Deferred row 2 ("fixed-odds threshold on `hash(pubkey, prevHash)` vs argmin over known peers"); `.memlog.md` (open question).
- **Problem:** The two deferred variants do **not** both satisfy the AD's "computable identically by every peer" clause: a fixed-odds threshold is peer-invariant, but "argmin over known peers" depends on each node's peer set, which differs per node and over time — different peers can select different miners for the same block *h*, forking consensus. Checklist 3: as written, this deferral *can* let units diverge.
- **Fix:** Add a constraint to AD-4 (or the Deferred row): "Whichever mapping is chosen MUST be a function only of (block *h* data, candidate public key) — independent of any node's peer set or local state — or include an explicit deterministic tie-break/fallback (e.g., fixed-odds fallback when the peer set is empty) so every peer computes the same winner."

### F4 — MEDIUM — AD-9 (and AD-8 renderer clause) are target-state, presented as ratified
- **Location:** Spine §AD-9 Rule; §AD-8 Rule (renderer clause); `src/main/blockchain/index.js` (`addBlock` → `process.stderr.write`, `replaceChain` → `console.error`/`console.log`); `src/main/blockchain/transaction-pool.js` (`validTransactions` → `console.error`); `src/config.js` (top-level `console.log`); renderer components `Blocks.js`, `ConductTransaction.js`, `TransactionPool.js` all `import globalConfig from '../../config'` and call `fetch(\`${globalConfig.ROOT_NODE_ADDRESS}/…\`)`.
- **Problem:** The memlog explicitly records AD-9 as "target state - current code has core logging to stderr in Blockchain.addBlock" and AD-8's renderer move as "a later OpenSpec change", yet the spine states both as flat ADOPTED rules without target-state marking (checklist 5). The dependency-direction diagram's "forbidden" edges (renderer → config, core → app/P2P) describe a state the code does not currently satisfy; a reader takes the diagram as the current ratified shape.
- **Fix:** Mark AD-8 (renderer clause) and AD-9 as **target-state** ADs in the spine; annotate the Dependency Direction diagram edges with "(target state)" so forbidden edges are read as enforced-by-convention-going-forward, not as current code fact. The existing Deferred rows ("Mechanical config split + renderer preload-bridge port") already carry the work — just make the status visible in the AD bodies.

### F5 — MEDIUM — Operational Envelope: key custody is undecided
- **Location:** Spine §Structural Seed → "Operational envelope" paragraph; `openspec/specs/wallet/spec.md` ("Wallet backup and recovery": encrypted seed backup, restore, corrupted-wallet detection); `src/main/blockchain/wallet.js` (keygen in constructor, hex private key persisted via Obj2fsHOC to `~/.succinctcoin/wallet`; no backup, no corruption detection, no recovery path).
- **Problem:** The envelope decides deployment form, store path, transport, NAT posture, and test isolation, but says nothing about **key custody**: plaintext hex private key on disk, no backup/restore mechanism, and silent key regeneration on a missing/corrupt file (funds silently orphaned) — while the wallet spec *requires* encrypted seed backup and corruption detection. Checklist 8 names key custody explicitly. Two units (wallet spec implementers vs. app-layer implementers) can legitimately diverge: one builds encrypted backup per spec, the other ratifies plaintext-and-regenerate per brownfield, and nothing in the spine arbitrates (checklist 1).
- **Fix:** Add one sentence to the Operational envelope (or a Consistency Conventions row): decide the custody posture — e.g., "Keys remain plaintext hex on disk (ratified brownfield); encrypted backup/restore and corruption detection are a target-state follow-up per wallet spec" — and add that follow-up to Deferred if it is not this spine's scope.

### F6 — LOW — Capability → Architecture Map / AD binds inconsistencies (checklist 6)
- **Location:** Spine §Capability → Architecture Map vs. AD binds lists.
- **Problem:** All 12 capabilities are present and "Lives in" is accurate (verified against code), but the map↔AD-binds relation is not bidirectionally consistent:
  1. `account-management` is governed by AD-1, AD-3 — but AD-3's binds list is `transaction-miner, transaction-system, configuration, wallet` (no `account-management`), even though AD-3's "stake is a neutral lock" is the very rule that governs account stake semantics.
  2. `blockchain-core` is governed by AD-1, AD-2, AD-4 — but AD-5 (root-seed rule, which directly constrains how the core's chain state may be mutated at startup) binds `p2p-networking, api-endpoints, configuration` and omits `blockchain-core`, even though its rule acts on core chain state.
- **Fix:** Add `account-management` to AD-3's binds and `blockchain-core` to AD-5's binds (or drop the map entries) so the map and binds agree in both directions.

### F7 — LOW — Operational Envelope: NAT/traversal and environment-isolation details incomplete
- **Location:** Spine §"Operational envelope" ("optional circuit-relay for NAT"); `openspec/specs/p2p-networking/spec.md` ("Circuit relay connectivity" — DCUtR upgrade, UPnP port mapping); `src/main/app/pubsub.js` (`autoNAT`, `dcutr`, `upnpNat` services, `relay()` transport); `openspec/specs/electron-app/spec.md` ("Dev mode uses separate storage: `.test/`") vs. `src/main/config.js` (`.test/` only under `JEST_WORKER_ID`) and `src/config.js` (`isDev` from `electron-is-dev`).
- **Problem:** (a) The envelope mentions only circuit-relay for NAT traversal, omitting DCUtR direct-upgrade and UPnP, which the spec mandates and the code implements — the traversal story a level-below builder needs is understated. (b) "Dev mode" is load-bearing for ports/channels/root address but never defined in the spine (code uses `electron-is-dev`), and the electron-app spec's "dev mode uses `.test/` storage" contradicts the code's JEST-only isolation — the spine's envelope picks the code's behavior (test isolation via `JEST_WORKER_ID`) without naming the dev/prod distinction that `isDev` actually drives.
- **Fix:** Expand the envelope's NAT clause to "circuit relay + DCUtR upgrade + UPnP attempt (fail-soft)"; add one clause defining environment detection (e.g., "dev = `electron-is-dev` true; channel prefix, ports, and ROOT_NODE_ADDRESS follow it; store isolation is test-run only via `JEST_WORKER_ID`") and record the electron-app spec's storage clause as needing a conforming spec fix.

### F8 — LOW — "I/O limited to its own on-disk store" over-claims core purity
- **Location:** Spine §Design Paradigm (Core bullet); `src/main/blockchain/transaction.js` (`validate()` → `new Account(…).retrieve()` reads the **accounts** store, i.e., a second on-disk store, during validation); `src/main/config.js` (top-level `fs.mkdirSync` side effects at import time).
- **Problem:** The core reads the accounts store while validating transactions (balance checks) — not merely "its own" store — and its config module performs filesystem I/O on import. Minor, but a strict reading of AD-1's purity claim would lead a level-below agent to "fix" legitimate cross-store reads or be surprised by them.
- **Fix:** Rephrase the Core bullet: "I/O limited to the application's on-disk stores (blocks, accounts, wallet, uuid) under the configured root" — ratifying the cross-store account read — and note `config.js` import-time `mkdirSync` as ratified brownfield (or move dir creation to `api.init()` in the config-split change).

### F9 — LOW — Consistency Conventions "hashing" row ratifies a determinism gap vs crypto-utils spec
- **Location:** Spine §Consistency Conventions (Hashing & signing row); `src/main/util/crypto.js` (`Crypto.hash` JSON-stringifies each input and sorts the *strings* — no recursive key sort); `openspec/specs/crypto-utils/spec.md` ("Hash object inputs deterministically… object keys are sorted **recursively**").
- **Problem:** The spec requires recursive key-sort so object inputs hash identically regardless of key insertion order; the code does plain `JSON.stringify`. Block hashes cover `data` (arrays of transaction objects) — if any peer ever stringifies with different key order (e.g., after a JSON round-trip that reorders keys), hashes diverge and chain validation breaks cross-node. The convention row ratifies the code without flagging the spec divergence.
- **Fix:** Either (a) add to Deferred: "Implement recursive key sorting in `Crypto.hash` to satisfy crypto-utils spec (cross-peer hash determinism for object inputs)", or (b) record a spec fix if the array-of-objects usage is deemed safe as-is. Do not leave it implicit in the conventions table.

---

## Verified clean

- **Stack versions (checklist 4):** every entry in the Spine Stack table verified live — Electron 42.3.0, Forge 7.11.2 (cli + plugin-webpack), React/react-dom 19.0.0, react-bootstrap 2.10.9, react-router-dom 7.16.0, Express 5.2.1, libp2p 3.3.2, @libp2p/gossipsub 15.0.15, @chainsafe/discv5 12.0.1, @libp2p/circuit-relay-v2 4.2.5, @noble/secp256k1 3.1.0 (transitive, externalized per `webpack.main.config.js`, jest-mapped per `package.json`), big.js 7.0.1, dayjs 1.11.13, Jest 30.4.2; runtime Node v24.14.0 matches "24.14.0". No stale or fabricated versions.
- **AD-2 ratification (checklist 5/7):** "longer valid chain wins" exactly matches `Blockchain.replaceChain` (length + `isValidChain`) in `src/main/blockchain/index.js`; no false inheritance claim.
- **AD-7 ratification (checklist 5):** `src/main/api.js` is in fact the only module instantiating the shared singletons (blockchain, pool at module scope; wallet, account, pubsub, miner in `init()`); all other units take constructor args (`pubsub.js`, `transaction-miner.js`).
- **Fee convention (checklist 5):** "fee computed in app layer as `Big(amount).div(1000)`; the core validates" matches `api.js` `/api/transact` and `transaction.js` `fee < amount/1000` validation exactly.
- **Hashing & signing convention:** sha512-of-sorted-JSON-strings + `@noble/secp256k1` hex signatures match `util/crypto.js` and `wallet.js` (the determinism caveat is F9, not a ratification error).
- **Transaction lifecycle convention:** "created only via `Wallet.createTransaction`, signed before pool, immutable" matches code and comments in `wallet.js`.
- **Special addresses / stake numbers:** sentinel strings, REWARD 100, MINIMUM_STAKE 200, ≤10% stake all match `src/main/config.js`, `transaction.js`, and the configuration/transaction-system specs.
- **Capability map coverage (checklist 6, location column):** all 12 capabilities listed with accurate "Lives in" paths (binds-consistency nits are F6).
- **Deferred: sybil resistance (checklist 3):** boundary invariant (no purchasable privilege) is locked in AD-3; deferring the mechanism cannot let units diverge on *what is allowed to exist*. Sound.
- **Deferred: ENR/relay contents (checklist 3):** shared shipped config data with graceful degradation (discovery disabled when empty) already specified — empty-vs-filled cannot diverge node behavior structurally. Sound.
- **No false inheritance claims (checklist 7):** every "existing"/"ratified" claim checked (replaceChain, composition root, fee, sentinels, headless-core import graph — verified no electron/express/libp2p imports in `src/main/blockchain/**` or `util/crypto.js`) holds.

---

## Checklist scorecard

| # | Item | Result |
| --- | --- | --- |
| 1 | Fixes real divergence points, misses none | Mostly yes; **missed** spec-vs-AD conflicts on mining trigger (F1) and root precedence scope (F2), and key custody (F5) |
| 2 | Every AD's Rule enforceable & prevents stated divergence | AD-1…AD-7, AD-10-equivalents enforceable via lint/review/code rules; AD-4's rule has the peer-invariance hole in its deferred variant (F3) |
| 3 | Nothing under Deferred lets units diverge | Lottery-mapping variant is not divergence-safe as written (F3); other 4 deferred rows sound |
| 4 | Named tech verified-current vs package.json | **Clean** (all 15 rows + Node runtime verified live) |
| 5 | Ratifies, doesn't contradict brownfield; target-state marked | AD-4, AD-8 (renderer clause), AD-9 are target-state without marking (F1, F4); rest ratify correctly |
| 6 | Map covers 12 capabilities w/ correct governing ADs | Coverage complete; two binds/map inconsistencies (F6) |
| 7 | No false inheritance claims | **Clean** |
| 8 | Every feature-altitude dimension decided/deferred/OQ; envelope adequacy | dev/test/prod: decided w/ one spec contradiction unrecorded (F7b); NAT: understated (F7a); store isolation: decided; **key custody: not decided (F5)** |
