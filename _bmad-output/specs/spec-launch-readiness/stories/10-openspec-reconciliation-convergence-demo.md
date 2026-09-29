---
title: 'OpenSpec reconciliation + convergence demo'
type: 'refactor'
created: '2026-09-25'
baseline_revision: '67bfe8ca684ab58c77eaaa524c334b4f90d6233b'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: [oversized]
deferred:
  - summary: >-
      transaction-system spec pool prose is pre-AD-10/AD-13 (validTransactions {state} derived-state parameter absent; syncFromRemote merge operation undescribed) and cannot be updated within this story's single-edit cap; belongs to a future spec-maintenance pass.
    evidence: |-
      transaction-pool.js validTransactions({ state }) filters against a caller-supplied derived state (AD-10) and syncFromRemote({ remoteMap }) additively merges local over remote (AD-13); the spec's prose predates both. This story's intent caps the file at the one setMap deletion.
    location: >-
      openspec/specs/transaction-system/spec.md
    severity: low
  - summary: >-
      The post-adoption pool clear (replaceChain's onSuccess callback clearing the mined transactions per adopted block) has no spec home in CAP-13's seven-file set; its natural home is the p2p-networking spec (the pubsub handler is p2p surface).
    evidence: |-
      pubsub.js handleBlockchainMessage passes an onSuccess to replaceChain that clears the pool per adopted block; the new boundary rows in pubsub.test.js pin the behavior, no requirement states it. Adding the clause means editing p2p-networking/spec.md, outside the seven named files.
    location: >-
      src/main/app/pubsub.js
    severity: low
  - summary: >-
      No test pins the dev-only mine route's 404-on-non-dev/wiring contract, and no direct verifySignature malformed-input pin exists in crypto.test.js (the jest noble mock stands between the test suite and real @noble/secp256k1); both are test-investment items for a future test-harness track.
    evidence: |-
      VG2: api.test.js has no supertest-style HTTP harness and adding one needs a new dependency; story 7 deferred the same addBlock-stderr-swallow class. The spec now documents the real @noble behavior matrix (64-byte -> false incl. non-hex coercion; wrong byte length and null/undefined -> reject; three containment surfaces), but the matrix is un-pinned by a test. A direct pin would require jest-mocking @noble/secp256k1 with a length- and null-sensitive stub in crypto.test.js.
    location: >-
      src/main/util/crypto.js
    severity: low
---

<intent-contract>

## Intent

**Problem:** The six canonical OpenSpec specs (blockchain-core, transaction-miner, api-endpoints, crypto-utils, wallet, electron-app) still describe pre-launch behavior — HTTP-triggered mining, AD-14-contradicting chain replacement, full-replace root pool sync, prime256v1/PEM keys, a never-served `/api/known-addresses` route, dev-mode `.test/` storage — so the spec suite is no longer the true contract. The epic's success signal (two independent nodes converge and transact past height 3) has no closing test.

**Approach:** Two deliverables. (A) Rewrite the six affected OpenSpec specs so every requirement and scenario traces to the shipped code at an architecture decision (AD-1..AD-14), and delete the one stale `setMap` scenario left in `transaction-system/spec.md` (story 5's deferred stale-spec item) — no new requirements invented. (B) Add the two-node convergence demonstration as the closing test: two isolated cores with separate storage roots (the `JEST_WORKER_ID` `.test/` fixture convention) plus pubsub message-boundary rows that close out stories 6/7's deferred equal-length convergence gap.

## Boundaries & Constraints

**Always:**
- Every rewritten requirement/scenario must match shipped code at `67bfe8c` and trace to a named AD (AD-10/12/14 → blockchain-core; AD-3/4/11 → transaction-miner; AD-7/8/9/13 → api-endpoints; AD-12 → crypto-utils; key-custody convention + AD-7 → wallet; AD-7/8 → electron-app).
- Rewrites are target-state: they replace stale clauses, they do not invent new requirements. The `setMap` scenario deletion in transaction-system is the only non-six-spec edit.
- The two-node test runs in-process as two cores whose `config.STORE.*` roots are patched per-node under `.test/convergence-<JEST_WORKER_ID>/node-<N>/` so the Story-9 single-writer `.test/wallet` invariant holds (no writer ever touches the shared root).
- Balances asserted via `deriveState(...)` + `big.js` integer units; no floats; test runs green under `npm test` (jest --ci), clean tree, zero new dependencies.

**Never:**
- No production code change (`src/main/`, `src/config.js`, `src/renderer/`, `__mocks__/`) unless the test exposes a genuine defect the intent mandates fixing — record any such change in the Spec Change Log first.
- No real libp2p transport in the test (no `discoverPeers()`, no network): the wire surface is exercised at the `PubSub` message handlers (`handleBlockchainMessage`/`handleTransactionMessage` on `TextEncoder`-encoded JSON), the boundary stories 6/7 named.
- No edits to `ARCHITECTURE-SPINE.md`, `openspec/config.yaml`, `openspec/changes/`, or any spec outside the seven named files.
- No renderer UI; no new OpenSpec change/archive artifacts (main specs are rewritten in place — `openspec/specs/` is the suite of record per SPEC.md); no changes to consensus rules, lottery parameters, or state-transition logic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CONVERGE_FROM_GENESIS | Node A mines ≥4 blocks (reward-funded, user tx in the last) with B genesis-only, then A broadcasts its full chain to B | B's chain becomes identical to A's (same block hashes); `deriveState(B.chain)['<B key>'].balance` equals the tx amount (big.js `eq`); both chains > height 3 | No error expected |
| FRESH_NODE_ADOPTION | A third genesis-only core receives the same broadcast | Its chain hashes are identical to A's and B's (convergence, not one-off adoption) | No error expected |
| STRICTLY_LONGER_ADOPTION | Node has a shorter local chain (≥1 self-mined reward block) when a longer valid chain arrives via `handleBlockchainMessage` | Local chain replaced; self-mined local tip discarded; pool cleared of adopted-chain txs by the adoption callback | No error expected |
| EQUAL_LENGTH_LOWER_HASH | Two equal-length locally-mined chains exchanged via `handleBlockchainMessage` | The node on the HIGHER-hash fork adopts the lower; the node on the lower keeps it and rejects the higher; pool cleared on adoption only | No error expected |
| EQUAL_LENGTH_IDENTICAL | Identical chain delivered | No-op; chain unchanged; pool NOT cleared | No error expected |

</intent-contract>

## Code Map

- `openspec/specs/blockchain-core/spec.md` -- 6 reqs, stale: "Block mining" (no canonical order/field set/lottery), "Block validation" ("reward last" wording contradicts shipped timestamp-ASC,uuid-ASC; tx-timestamp rule mis-stated as `>=` vs shipped equality-for-all-txs), "Chain replacement (consensus)" (AD-14: the "shorter or equal → unchanged" scenario is false for lower-hash equal-length adoption), "Block persistence" (ok).
- `openspec/specs/transaction-miner/spec.md` -- 3 reqs, all HTTP-triggered-model ("when mineTransactions() is called") → AD-4 autonomous interval + AD-11 self-evaluated lottery winner gate; `/api/mine-transactions` is dev-only.
- `openspec/specs/api-endpoints/spec.md` -- 12 reqs. Stale: "Mine transactions" (dev-only demotion); "Create transaction" error envelope (AD-9 codes: 400 invalid / 409 pending-duplicate same-sender / 402 insufficient balance / 500 unexpected); "Get wallet information" missing the IPC scenario; missing `/api/port` IPC (story 8 deferral), `wallet-export`/`wallet-restore` IPC rows (story 9); "List known addresses" describes a route that does not exist; "Root state synchronization" (AD-5/AD-13: empty-chain-gated chain half + additive uuid merge, never full replace).
- `openspec/specs/crypto-utils/spec.md` -- "Hash computation" already documents recursive key sort (shipped in `sortKeysDeep`, story 1 — keep, verify trace to AD-12); "Public key validation" says secp256k1 (match `Crypto.isPublicKey` — 64/66/130 hex) while `openspec/config.yaml` still says prime256v1 (config.yaml is OUT of scope; the spec is correct as-is).
- `openspec/specs/wallet/spec.md` -- Stale: "Key pair generation" (prime256v1/PEM 178-char → secp256k1 hex pair via runtime keygen), "Transaction signing" (sha512-of-canonical-field-array, hex sig, AD-12 pin), "Wallet persistence" path clause (".test/wallet in dev mode" → `~/.succinctcoin/wallet`, `.test/` only under `JEST_WORKER_ID`). "Wallet backup and recovery" is already target-state (story 9) — keep byte-identical. Add an "IPC surfaces" note for export/restore channels if the api-endpoints rows reference them.
- `openspec/specs/electron-app/spec.md` -- Stale: endpoint list naming `/api/mine-transactions` unconditionally (dev-only), "Dev mode uses separate storage" (`.test/` ⇔ `JEST_WORKER_ID`, not dev mode), "Wallet restored on startup" (strict fail-fast `corrupted-wallet`, not silent reload).
- `openspec/specs/transaction-system/spec.md` -- ONE targeted edit: delete the stale "Set pool from external map / setMap()" scenario (no `setMap` in `transaction-pool.js` since story 5); nothing else in this file changes.
- `_bmad-output/planning-artifacts/architecture/architecture-succinctcoin-2026-09-19/ARCHITECTURE-SPINE.md` -- RE-USE READ-ONLY: the AD definitions are the rewrite's requirement-trace source. The AD-14 "still rejected (no replace)" sentence (story 6 deferral) is NOT reconciled here — spine is a planning artifact, out of CAP-13's six-spec scope; the canonical SPEC.md CAP-7 already resolves the reading.
- `src/main/config.js` -- `ROOT` = `~/.succinctcoin` (prod) vs `path.resolve('.test')` (JEST_WORKER_ID set); `STORE.{WALLET,ACCOUNTS,BLOCKS,UUID}`; `LOTTERY_ODDS=1000`, `BLOCK_CONTENT_FIELDS`, `REWARD_ADDRESS/REWARD_AMOUNT`. In the test: `beforeEach` does `fs.rmSync(base,{recursive,force})` on a per-worker base (`.test/convergence-demo`) then re-`mkdir`s, and sets `config.STORE.* = path.join(base, <nodeDir>, ...)` per node; the default-exported `STORE` object is mutated in place so every core module (which reads `config.STORE.*` at construction) sees the patched paths.
- `src/main/blockchain/block.js` -- `Block.genesis()`, `mineBlock({wallet})` (reward tx → canonical sort → hash → sign), `validate({state})` (reward-only blocks rejected at height > 3; timestamps: user-tx must satisfy `block.timestamp >= tx.timestamp`, reward must equal; canonical data-order check; single reward; miner `isPublicKey`). `this.key` computed from `config.STORE.BLOCKS` at construction → construct-after-patch ordering is mandatory.
- `src/main/blockchain/index.js` -- `addBlock({data, wallet})` (stderr-swallowing null on failure — story 7 deferral, NOT touched), `replaceChain(chain, onSuccess)` (strictly-longer valid replaces; equal → `compareForks` lower-hash adoption; identical no-op), `isValidChain`.
- `src/main/blockchain/lottery.js` -- `isLotteryWinner({prevBlockHash, publicKey, odds})` (AD-11 pinned, BigInt, `2^512/odds`). Mining ELIGIBILITY only — tested in story 4, NOT needed here: `addBlock` imposes no lottery check, so the demo mines by direct `addBlock` (convergence is about chain-replacement rules, orthogonal to who-wins-the-lottery).
- `src/main/blockchain/state.js` -- `deriveState(chain)` pure fold → the balance-assertion source for every node (AD-10).
- `src/main/app/pubsub.js` -- `deserializeChain`/`deserializeTransaction` (JSON → instances), `handleBlockchainMessage(data)` (replaceChain + onSuccess pool clear), `handleTransactionMessage`, `broadcastChain`/`broadcastTransaction` (encode with `TextEncoder`, JSON of `blockchain.chain`). Constructor needs `{blockchain, transactionPool, wallet}`; test drives the handlers directly with a pool that has a live pending tx (pool-clear observability).
- `src/main/app/pubsub.test.js` -- RE-USE PATTERN: the virtual `jest.mock` block (12 libp2p/discv5/enr packages `{ virtual: true }` + `electron-is-dev → false`) is REQUIRED by both new test homes, because `pubsub.js` imports the ESM-only libp2p stack at module scope; `encodeMessage = message => new TextEncoder().encode(JSON.stringify(message))` is the exact wire encoding both the demo and the boundary rows must use (it is what the handlers decode).
- `src/main/api.js` -- read-only reference for the IPC surface the api-endpoints rows must document (`/api/wallet-info`, `/api/port`, `/api/wallet-export`, `/api/wallet-restore` as `ipcMain.on` + `event.returnValue`; route inventory for the "no known-addresses route" claim).
- `src/main/api.test.js` -- RE-USE PATTERN: `jest.mock('./config')` factory must patch `.default` (consumers read the default export) to redirect `STORE.WALLET` per-worker.
- `__mocks__/@noble/secp256k1.js` -- mock keygen caches priv→pub per worker; `getPublicKey`/`signAsync`/`verifyAsync` throw/false unless the key was keygen'd in-process → every test core's wallet is `new Wallet()` (keygen at construction); cross-node signature validation works because the cache is shared within the worker.
- `node_modules/obj2fs-hoc` -- HOC `store()/retrieveThrough()`; `Wallet.load()` (strict CAP-12) is the only wallet reader in the prod path; Block/Account persistence keyed by construction-time `this.key`.
- Test homes: NEW `src/main/convergence-demo.test.js` (two/four-core demo) and EXISTING `src/main/app/pubsub.test.js` (equal-length boundary rows join the suite that already exercises the message handlers).

## Tasks & Acceptance

**Execution:**
- `openspec/specs/blockchain-core/spec.md` -- rewrite "Block mining" (the winner self-evaluating the AD-11 family; canonical content form per AD-12 with the pinned hash field set and (timestamp ASC, uuid ASC) data order; height/lastHash links; reward transaction appended per AD-3), "Block validation" (all shipped rules incl. canonical-order rejection, reward-only blocks rejected above height 3, the reward-must-equal / user-tx-must-not-exceed timestamp rules phrased exactly as shipped), "Chain replacement (consensus)" (longer-valid replaces; equal-length lower-hash adoption at first divergence — AD-14; higher equal-length rejected; identical no-op; shorter rejected) -- makes the spec the true contract for stories 4/5/6. Mining cadence (the re-check interval) is AD-4/AD-8 app-owned and lives in the transaction-miner spec, NOT here.
- `openspec/specs/transaction-miner/spec.md` -- rewrite all three requirements to the AD-4/AD-11 model: autonomous start/stop on the app-semantic re-check interval, self-evaluated lottery per tick, mine-only-on-win, pool validity filtering against derived state, post-mine clear; `/api/mine-transactions` demoted to a dev-only convenience -- closes the spine's "autonomous-mining model in specs" deferral.
- `openspec/specs/api-endpoints/spec.md` -- rewrite "Mine transactions" (dev-only), "Create transaction" (AD-9 envelope `{type:'error',code,message}` with the full status map incl. the pending-duplicate 409; client-never-supplies-fee kept), "Amount validation" (reconcile with the shipped Big pre-check → 400), "Non-400 failure responses" (500 unexpected via the error-mapper; reconcile the 401/403 missing-wallet clause with the shipped reality that `init()` always loads/creates a wallet before any request can be served), "Get wallet information" (add the IPC scenario), add `/api/port` IPC + `getApiPort` bridge row (story 8 deferral) and `/api/wallet-export` + `/api/wallet-restore` IPC rows (story 9), DELETE "List known addresses" (route does not exist in `api.js`), rewrite "Root state synchronization" (AD-5 emptiness-gated chain half; AD-13 additive uuid merge pool half; no full replace) -- full replace per the carried-over story 5 deferral.
- `openspec/specs/crypto-utils/spec.md` -- verify/align all three requirements to shipped `util/crypto.js` (recursive key sort per AD-12; malformed-sign-safe verify; 64/66/130-hex secp256k1 key check) -- mostly confirmation; change only what does not trace.
- `openspec/specs/wallet/spec.md` -- rewrite "Key pair generation" (secp256k1 hex pair, runtime keygen), "Transaction signing" (AD-12 pinned field array, hex sig), "Wallet persistence" (strict `load()` semantics + single writer at `~/.succinctcoin/wallet`, `.test/` only under `JEST_WORKER_ID`), add backup/restore/corruption IPC-surface note -- keep "Wallet backup and recovery" byte-identical (already story 9 target-state).
- `openspec/specs/electron-app/spec.md` -- rewrite "Data persistence across restarts" (strict fail-fast wallet load; `JEST_WORKER_ID` storage isolation replacing the dev-mode clause) and the Express endpoint list (dev-only marking) -- closes the spine's "dev-storage clause" deferral.
- `openspec/specs/transaction-system/spec.md` -- delete the stale "Set pool from external map" (`setMap`) scenario only; leave every other requirement untouched -- closes the story 5 stale-spec deferral.
- `src/main/convergence-demo.test.js` -- NEW closing test: per-test temp roots under a per-worker base `.test/convergence-demo` (cleaned + rebuilt in `beforeEach`), patched into `src/main/config.js` `STORE.*` (patch-before-construct ordering); two cores (wallet/blockchain/pool/pubsub) built per node at `node-1`/`node-2` (+ a third `node-3` for FRESH_NODE_ADOPTION); the pubsub.test.js virtual-mock block + `encodeMessage` reused; mining by direct `addBlock` calls (same primitive `pubsub.test.js` uses); wire delivery via the encoded `JSON.stringify(chain)` into the peer's `handleBlockchainMessage`; assertions per the I/O matrix (identical block hashes across the nodes; derived balance eq).
- `src/main/app/pubsub.test.js` -- add the equal-length boundary rows (STRICTLY_LONGER_ADOPTION, EQUAL_LENGTH_LOWER_HASH both directions, EQUAL_LENGTH_IDENTICAL no-op) with a live pending pool tx proving the adoption-only pool clear -- closes the story 6 convergence-boundary + story 6 pubsub deferrals.

**Acceptance Criteria:**
- Given the rewritten suite, when `openspec validate --specs` runs, then every one of the six rewritten specs reports valid and no other spec file is modified (`git diff --stat -- openspec/` shows exactly the seven named files).
- Given the rewritten specs, when every requirement is checked against `src/main/` at this baseline, then none of the six specs (plus transaction-system's pool requirement) states behavior the code no longer has, and each rewritten requirement cites or matches a named AD.
- Given two in-process cores with separate `.test/convergence-*/node-*` roots, when core A mines ≥4 blocks including a user transaction from A to B and A's full chain is delivered to the genesis-only core B via `handleBlockchainMessage`, then B's chain hashes equal A's, `deriveState(B.chain)['<B key>'].balance` big.js-equals the transaction amount, and both chains exceed height 3.
- Given the scenario above plus a third fresh core receiving the same broadcast, when all three states are compared, then the three chains are hash-identical and `deriveState` outputs are deeply equal.
- Given a node holding a shorter local chain (≥1 self-mined reward block) with a same-sender pending pool tx, when a longer valid chain arrives, then the local chain is replaced, the pending tx is removed from the pool by the adoption callback, and the node's derived balances follow the adopted chain.
- Given two nodes on equal-length divergent locally-mined chains, when each delivers its chain to the other, then the node on the higher divergence hash adopts the lower and the node on the lower keeps its chain (rejecting the higher), with pool clearing only on adoption.

## Spec Change Log

(Empty until the first bad-spec loopback.)

## Review Triage Log

### 2026-09-25 — Review pass

- verdicts: 29 findings — high 0, medium 5, low 7, false 17, maybe-false 0
- findings:
  - `[medium]` `[patch]` (G2 | B1) Phantom `GET /api/wallet-info` HTTP scenario while the code exposes the channel only via `ipcMain.on` — verified: api.js has no HTTP wallet-info route; requirement + phantom scenario reworded to IPC-only pull (api-endpoints).
  - `[medium]` `[patch]` (G1 | B2) crypto-utils "the test harness pins false-not-throw for wrong-length/non-hex/null/undefined signatures" claim unsupported by any `crypto.test.js` row — verified true; probe of real `@noble/secp256k1` + `hexToBytes` established the actual matrix: a 64-byte converted signature resolves `false` (non-hex content coerces to zero bytes, still 64 bytes), a signature whose converted length ≠ 64 bytes REJECTS, `null`/`undefined` REJECT with `TypeError`; requirement + scenarios reworded to that matrix. A direct crypto.test.js pin was NOT added — the jest noble mock stands between the suite and the real library and a faithful pin would need a length- and null-sensitive stub; recorded as a deferral with the dev-mine route item (see VG2 row).
  - `[medium]` `[patch]` (G3 | B3) `/api/blocks/length` scenario says "JSON object" but the route replies with a bare JSON number — verified: `res.json(blockchain.chain.length)`; the renderer consumer (`Blocks.js`) reads a number; scenario reworded to "bare JSON number" (api-endpoints).
  - `[medium]` `[patch]` (G1 | VG1, pre-verified verification-gap) No test pins any malformed-signature behavior: `crypto.test.js` has zero `verifySignature` rows and the noble mock swallows throws — verified as filed; disposition filed as "patch or future harness investment"; the spec reword to the true matrix was applied this pass, the test pin deferred (see deferral 3).
  - `[medium]` `[patch]` (G1 | IA-5) Same root as B2/VG1: the rewritten "Signature verification" requirement asserts a harness pin that does not exist — fixed by the identical reword; one entry, group verdict medium.
  - `[low]` `[defer]` (G8 | B5) Post-adoption pool clear (the `replaceChain(onSuccess)` callback clearing mined txs per adopted block) has no spec home in the seven-file set — verified: the requirement's natural home is the p2p-networking spec (the pubsub handler is p2p surface), outside CAP-13's files; behavior is pinned by the new pubsub boundary rows; recorded as deferral 2.
  - `[low]` `[patch]` (G4 | B9) Transaction-miner "A node SHALL mine a new block only when it is the lottery winner" reads as contradicting the dev endpoint's "(lottery not consulted)" — verified: true tension as written; the requirement now scopes the winner gate to "on the autonomous path" with the dev bypass named inline, matching the shipped two-path design.
  - `[low]` `[patch]` (G5 | B10) Block-validation prose conflated the always-applied "data non-empty" conjunct with the height-3-gated reward-only rule ("its data is non-empty (a block above height 3 SHALL NOT contain only a reward transaction)") — verified against `block.js:73-77`: empty data rejects at ANY height; reward-only rejects only at `height > 3`. Prose split into the two shipped rules. A dedicated "invalid-height" scenario was not added: the shipped reject list contains no distinct height rule beyond the height-3-gated data rules, and a scenario asserting "invalid height is rejected" would name behavior the code does not implement — the two existing scenarios (missing-reward, reward-only > 3) plus the height-links-parent check already cover the shipped surface.
  - `[low]` `[patch]` (G6 | B15) "Identical contents hash identically" scenario omits the block uuid from the input list while the pinned hash field set is `(height, uuid, timestamp, miner, lastHash, data)` — verified two blocks with equal inputs minus uuid hash differently; `uuid` added to the scenario's WHEN inputs.
  - `[low]` `[defer]` (G7 | B13) transaction-system pool prose predates the derived-state pool API (`validTransactions({ state })` parameter absent from the prose) — verified; the intent's 1-edit cap (the `setMap` deletion only) excludes this fix here; recorded as deferral 1.
  - `[low]` `[defer]` (G7 | B14) Same root as B13: `syncFromRemote`'s additive local-over-remote merge (AD-13) is undescribed in the transaction-system prose — grouped with B13, deferral 1.
  - `[low]` `[defer]` (G9 | VG2, pre-verified verification-gap) The dev-only mine route's 404-on-non-dev / wiring contract has no test, and no HTTP harness exists without a new dependency — verified as filed (story 7 deferred the same route-wiring class); recorded as deferral 3 with the crypto pin.
  - `[false]` `[reject]` (B4) electron-app endpoint list "incomplete vs api-endpoints" — refuted: the full HTTP inventory from api.js (blocks, blocks/length, blocks/:id, mine-transactions [dev-only], transact POST, transaction-pool-map) is exactly what the documented surface requirement lists; the IPC channels are intentionally referenced-not-repeated.
  - `[false]` `[reject]` (B6) "init() doesn't await/catch discoverPeers" — refuted: api.js:40-46 shows `try { await pubsub.discoverPeers() } catch { console.error }`; the spec line is accurate.
  - `[false]` `[reject]` (B7) "No 401 or 403 responses" scenario is unreachable-state theater — refuted: the invariant is code-accurate (init() strict-loads before any request is served; no auth surface exists) and states it deliberately.
  - `[false]` `[reject]` (B8) The error-mapper's untyped branch (500 `unexpected-error`) drops the caller's code, so documenting `corrupted-wallet`/`invalid-backup` as typed is misleading — refuted: the two custody codes surface only over IPC (their handlers build the typed reply directly); no HTTP path ever feeds them to the mapper, so the documented contract holds for every served surface.
  - `[false]` `[reject]` (B11) "non-finite amounts cannot be parsed" is wrong — big.js accepts `Infinity` — refuted empirically: `new Big(NaN)`, `new Big(Infinity)`, `new Big(-Infinity)`, `"NaN"`, `"Infinity"`, `"abc"`, `""` ALL throw `[big.js] Invalid number`; the spec wording is accurate.
  - `[false]` `[reject]` (B12) Fee `Big(amount).div(1000)` "can produce a non-terminating/unsafe decimal" — refuted: `amount` is an integer unit, so `amount/1000` terminates in ≤ 3 decimal places; the fee rule is self-consistent with `validateStructure`.
  - `[false]` `[reject]` (B16) The equal-length fork test "only covers direct adoption, not the shared-prefix construction" — refuted: equal-length forks REQUIRE a shared prefix to be valid from the same genesis, and the test constructs exactly that (shared funded block-1, divergent real-mined block-2, both directions asserted conditionally on the lower hash).
  - `[false]` `[reject]` (B17) In-place `config.STORE` mutation without restore "leaks node paths across suites" — refuted: jest uses a per-file module registry (mutation is file-scoped), the mutation runs in `beforeEach` BEFORE any construction, `beforeEach` re-cleans the base dir, and both the full suite and a `--randomize=true` run are green (258/258 each).
  - `[false]` `[reject]` (B18) Speculative future scenario the spec does not claim (documented inline in Design Notes; the pinned behavior is covered by block.test.js) — no reachable bad outcome in this change.
  - `[false]` `[reject]` (B19) Dev route hole: (a) a pre-init request could reach `mine-transactions` — refuted: `createWindow` awaits `api.init()` before `api.api.listen()`, so no pre-init request can exist; (b) a >height-3 empty-pool mine "redirects as if nothing failed" — refuted: that is exactly the shipped addBlock-stderr-swallow behavior and the spec's "redirect to /api/blocks" + "broadcast on success" lines describe it faithfully (the swallow is story 7's pre-existing deferral).
  - `[false]` `[reject]` (E1) "Fresh per-test storage roots leak state between convergence rows" — refuted: `beforeEach` rmSync + mkdirSync rebuilds the per-worker base, and every node is constructed after its paths are patched.
  - `[false]` `[reject]` (E2) "The demo's fee is a float" — refuted: the fee is `Big(amount).div(1000)`, a big.js value, reproduced exactly from the app's own computation (`api.js`).
  - `[false]` `[reject]` (E3) Same root as E2 (fee arithmetic in the FRESH_NODE_ADOPTION node) — refuted identically.
  - `[false]` `[reject]` (IA-1) "The convergence demo skips the declared mining path (autonomous miner)" — refuted: the intent's declared success signal is convergence past height 3 + balance reflection; the lottery is eligibility (AD-11, story-4 tested) and `addBlock` imposes no gate — the design choice and its rationale are recorded in the spec's Design Notes.
  - `[false]` `[reject]` (IA-2) "The spine's AD-14 'still rejected (no replace)' sentence remains unreconciled" — refuted: the spine is a planning artifact explicitly excluded by the intent's Never list; it was recorded as a deferral in story 6 and SPEC.md CAP-7 is canonical.
  - `[false]` `[reject]` (IA-3) "The demo's root shape diverges from the directory template" — refuted: all convention invariants hold (under `.test/` with `JEST_WORKER_ID`, per-node root, cleaned per test); the template was illustrative.
  - `[false]` `[reject]` (IA-4) "Rewrote specs verified only against pre-existing tests, not the new code" — refuted: the rewrites were validated against the shipped code requirement-by-requirement at triage; the code is covered by the full suite (258/258).

## Auto Run Result

**Summary:** Story 10 is complete. The six affected OpenSpec specs (plus the transaction-system `setMap` deletion) are rewritten so every requirement and scenario traces to the shipped code at `67bfe8c` and its architecture decisions (AD-1..AD-14) — no stale modeling of HTTP-triggered mining, pre-AD-14 chain replacement, full-replace root sync, or prime256v1 keys remains, and the never-served `/api/known-addresses` route is gone. The epic's success signal now has a closing test: three in-process cores mine/converge from a shared genesis to identical chains past height 3 with `deriveState`-derived balances, and the equal-length/strictly-longer/identical chain-replacement boundaries (stories 6/7's deferral) are pinned at the pubsub message boundary. No production code was touched by implementation or review; the review's 6 patch groups were spec-wording corrections applied on top.

**Files changed:**
- `openspec/specs/blockchain-core/spec.md` — rewrite: canonical content form (AD-12 field set + order), all shipped validation rules, AD-14 chain replacement; G5 prose split (empty-data vs height-3 reward-only) + G6 uuid in identical-contents inputs.
- `openspec/specs/transaction-miner/spec.md` — full AD-4/AD-11 rewrite (autonomous interval, self-evaluated lottery, in-flight guard, dev-only endpoint, derived-state pool filtering, broadcast+clear, failed-mine intact); G4 winner-gate qualifier.
- `openspec/specs/api-endpoints/spec.md` — dev-only mine, AD-9 envelope, big.js amount pre-check, unexpected-failure responses, genesis-only + AD-13 pool sync, wallet export/restore + `/api/port` IPC added, known-addresses deleted; G2 wallet-info IPC-only, G3 bare-number chain length.
- `openspec/specs/crypto-utils/spec.md` — AD-12 hash/signature/isPublicKey alignment; G1 signature-verification reword to the empirically probed real-@noble behavior matrix with the three containment surfaces.
- `openspec/specs/wallet/spec.md` — secp256k1 hex pair, AD-12 pinned signing, strict `load()`; "Wallet backup and recovery" deliberately unchanged.
- `openspec/specs/electron-app/spec.md` — dev-only endpoint mark, strict fail-fast load, test-worker storage isolation.
- `openspec/specs/transaction-system/spec.md` — only the stale `setMap` scenario deleted.
- `src/main/convergence-demo.test.js` — NEW: 3-core convergence demo (CONVERGE_FROM_GENESIS, FRESH_NODE_ADOPTION), per-node patched `STORE`, fee `Big(amount).div(1000)`.
- `src/main/app/pubsub.test.js` — new `handleBlockchainMessage()` chain-replacement boundaries describe block (STRICTLY_LONGER_ADOPTION, EQUAL_LENGTH_LOWER_HASH both directions, EQUAL_LENGTH_IDENTICAL no-op).
- `_bmad-output/specs/spec-launch-readiness/stories/10-…md` — this spec: triage log, auto run result, `status: done`, `followup_review_recommended: true`, 3 deferrals.

**Review findings breakdown:** 29 findings — high 0, medium 5, low 7, false 17. Patches applied (3 entries; entry verdicts: medium 3, low 3): G1 (B2+VG1+IA-5) crypto-utils reword to the probed behavior matrix; G2 (B1) wallet-info scenario deleted to IPC-only; G3 (B3) chain length reworded to a bare number; G4 (B9) miner winner-gate qualifier; G5 (B10) validation prose split. Deferred (3 items / 5 findings): transaction-system pool prose (B13+B14); post-adoption pool-clear spec home (B5); dev-route wiring + crypto pin test investment (VG2, folded with the dropped direct-pin). Rejected (17 findings, all with recorded evidence): B4, B6 (disproven empirically — init does await+catch), B7, B8, B11 (disproven empirically — big.js throws on non-finite), B12, B16, B17 (per-file module registry + 2 green randomized runs), B18, B19 (init-before-listen + faithful description), E1–E3, IA-1–IA-4.

**Follow-up review recommendation:** `true` (first pass; 3 `medium`-verdict entries patched — threshold of 2 met). The specific unverified risk: the probed real-`@noble` behavior matrix (64-byte → `false`; wrong converted length and null/undefined → reject) is documented in the crypto-utils spec but still un-pinned by any test — the jest noble mock stands between the suite and the library, and `hexToBytes`'s `parseInt`-coercion semantics are an implementation detail a refactor could change without tripping a test.

**Verification performed (all green, post-patch):**
- `npx jest src/main/convergence-demo.test.js src/main/app/pubsub.test.js --ci` — 9/9 pass.
- `npm test` — 258/258, 21 suites (baseline 253 + 5 new rows).
- `npm test -- --randomize=true` — 258/258 (cross-suite fixture invariant).
- `npm run lint` — 60 problems (36 err / 24 warn) = baseline; zero in new/touched files.
- `openspec validate --specs` — `Totals: 12 passed, 0 failed`.
- `git diff --stat -- openspec/` — exactly 7 files (the six rewrites + transaction-system).
- `grep -rn setMap openspec/specs/` — no matches.

**Residual risks:** The three deferrals above. The crypto-utils behavior matrix is spec-documented but test-unpinned (the follow-up review target). No production code risk: zero `src/` production files touched.

## Design Notes

**Why patch `config.STORE` per node instead of real isolation (separate processes/ports):** every core unit computes its storage key from `config.STORE.*` at construction time (`block.js:33`, `account.js:23`, `wallet.js:30`), while `Blockchain`/`TransactionPool`/`lottery`/`state` are storage-free singletons — so mutating the default-exported config's `STORE` before constructing each core's instances gives full per-node isolation in one jest worker, honors the `JEST_WORKER_ID` `.test/` convention, and keeps the Story-9 single-writer wallet invariant intact (both wallets live at `node-*/wallet`, never the shared `.test/wallet`). The `api.test.js` precedent (jest-mock config, `.default` patch) is the mechanism reference; here a plain mutation suffices because the demo re-imports nothing across nodes after patching.

```js
// per test, per node (patch BEFORE constructing that node's instances):
config.STORE.WALLET   = path.join(base, nodeDir, 'wallet')
config.STORE.ACCOUNTS = path.join(base, nodeDir, 'accounts')
config.STORE.BLOCKS   = path.join(base, nodeDir, 'blocks')
const aWallet = await new Wallet().load()   // first-run persist at aWallet's root
const aChain  = new Blockchain()            // Block keys built from patched STORE.BLOCKS
```

**Why direct `addBlock` instead of the interval miner:** `addBlock` (the same primitive `pubsub.test.js` uses) has no lottery gate — the AD-11 lottery is *mining eligibility*, tested in story 4, and is orthogonal to the chain-replacement rules this demo covers. Calling `addBlock({ data, wallet })` directly keeps mining deterministic and sub-second with no timer or win-probability flake, and asserts the SPEC.md success signal (same genesis → identical chains + reflected balance) rather than re-testing the lottery's statistical scaling. The user tx is created via `walletA.createTransaction({ recipient: walletB.publicKey, amount, fee: Big(amount).div(1000) })` then passed as `addBlock`'s `data` (the `Wallet.createTransaction`-only creation rule; the sender is funded by an earlier reward block so `validate()` passes). `fee` must be a `big.js` string ≥ `amount/1000` or `validateStructure` rejects it.

## Verification

**Commands:**
- `npx jest src/main/convergence-demo.test.js src/main/app/pubsub.test.js --ci` -- expected: all pass; new rows are the only additions to these two suites.
- `npm test` -- expected: 253 baseline + new rows, 0 failures; run once more with `--randomize=true` (cross-suite fixture invariant).
- `npm run lint` -- expected: 60 total problems (36 err / 24 warn) = baseline; zero new in new/touched test files.
- `openspec validate --specs` -- expected: `Totals: 12 passed, 0 failed` (baseline captured at plan time: all 12 specs valid; re-run after the rewrites and compare) — do NOT run bare `openspec validate` (it is interactive and hangs).
- `git diff --stat -- openspec/` -- expected: exactly seven files (six rewrites + transaction-system).
- `grep -rn "setMap" openspec/specs/` -- expected: no matches.
- Clean tree after commit; no push (user's job).
