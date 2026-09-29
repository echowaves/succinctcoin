---
title: 'Canonical block contents + pool sync'
type: 'refactor'
created: '2026-09-22'
status: 'done'
baseline_revision: 'e4595560f88a2ebd7ecbca555f799d0cc5490ab4'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      Remote pool entries ingested over HTTP are plain JSON without the Transaction prototype; validTransactions drops them (no rehydration) and syncFromRemote performs no per-entry shape validation.
    evidence: |-
      Transaction.validate is a prototype method (transaction.js); syncFromRemote spreads the raw res.json() map into the pool, so adopted entries throw TypeError inside validTransactions and are logged away. Pre-existing: the removed setMap had the identical hole (the old api.js passed the same plain map).
    location: >-
      src/main/blockchain/transaction-pool.js (syncFromRemote) / src/main/app/root-sync.js
    severity: medium
  - summary: >-
      root-sync fetch error containment: Promise.all couples the two fetches, there are no response.ok guards, and the startup call site (src/main/index.js:21) has no catch, so an unreachable or failing root becomes an unhandled rejection.
    evidence: |-
      The old api.js body had un-awaited .then chains with the same unhandled-rejection exposure, and index.js:21 is unchanged by this diff — pre-existing, not caused by story 5.
    location: >-
      src/main/app/root-sync.js / src/main/index.js:21
    severity: medium
  - summary: >-
      Root chains served over HTTP are plain JSON objects, not Block instances; replaceChain -> isValidChain -> block.validate fails on method-less objects and the chain is silently not adopted.
    evidence: |-
      The old api.js passed the same res.json() output to replaceChain; the pubsub path rehydrates (deserializeChain/deserializeTransaction) but the HTTP root path never did — pre-existing.
    location: >-
      src/main/app/root-sync.js (replaceChain input)
    severity: medium
  - summary: >-
      OpenSpec canonical specs are stale for the changed behavior: transaction-system still specifies setMap(), and api-endpoints still specifies ungated full-replace root sync.
    evidence: |-
      openspec/specs/transaction-system/spec.md:119-120 (setMap) and openspec/specs/api-endpoints/spec.md:121,125 (SHALL be replaced) contradict the shipped gate + merge. Owned by story 10 (OpenSpec reconciliation + CAP-13).
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Block `data` is ordered by an inconsistent comparator (`mineBlock` uses `a.timestamp >= b.timestamp ? 1 : -1`; `validate` only checks non-decreasing timestamps), so two independently built blocks with identical logical contents can have different `data` orders and therefore different hashes — breaking AD-12's canonical-content guarantee. Separately, root synchronization (`syncWithRootState`) full-replaces the local pool via `setMap` and replaces the local chain without any empty-chain gate, so the root holds standing override authority (violating AD-5/AD-13).

**Approach:** Pin one canonical total order on block `data` (timestamp ASC, uuid ASC) as a single shared function used by both mining and validation, with the hash field set pinned as a versioned constant; remove the `setMap` full-replace entirely and replace root pool sync with an empty-gated adopt / additive uuid merge; gate root chain sync on the local chain being empty (genesis-only).

## Boundaries & Constraints

**Always:**
- The block hash input field set is exactly (height, uuid, timestamp, miner, lastHash, data) — already true; pin it as a named versioned constant (`BLOCK_CONTENT_VERSION` = 1 and the canonical field list) in core config, asserted by a test. The constant does NOT enter the hash input (AD-12 field set is closed).
- `data` total order is (timestamp ASC, uuid ASC), enforced by ONE shared canonical sort function used by both `mineBlock` and `validate`; a `validate` failure on wrong order throws the existing 'Invalid sort order' error.
- Any change to the field set or the order is a hard fork (AD-12) — the version constant exists so that change is deliberate and flagged; this story does not bump it.
- Pool sync: when the local chain is empty (genesis-only), the node adopts the root/remote pool; when the chain is non-empty, remote pool contents merge additively by uuid and local entries survive uuid collisions. One code path serves both cases (merge of an empty local map equals adoption).
- Root chain sync applies only while the local chain is genesis-only (`chain.length === 1`); afterward the root's chain is ignored (root holds no standing authority, AD-5).
- The existing `replaceChain` peer rule (incoming chain must be strictly longer and valid) is unchanged — equal-length fork resolution is story 6.
- No changes to `Crypto.hash`, the tx signature input set, wallet, or the state transition (stories 1–4 territory).

**Never:**
- No `setMap` or any other full-replace of the pool map survives in `src/` (remove the method AND its call site; no partial fix).
- No root/authority semantics in the core: the empty-chain gate lives in the app layer where root sync happens.
- No new dependencies; max cyclomatic complexity 8; no HTTP/IPC knowledge in the core.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CANONICAL_HASH_EQUIV | two blocks with identical logical contents, `data` inserted in different orders, both mined/sorted canonically | identical `data` array and identical hash | No error expected |
| TOTAL_ORDER | `data` with mixed timestamps and uuids | canonical sort yields timestamp ASC, then uuid ASC | No error expected |
| WRONG_ORDER_REJECTED | block whose `data` violates the total order | validate rejects | throws 'Invalid sort order' |
| FIELD_SET_PIN | the pinned canonical field list constant | exactly [height, uuid, timestamp, miner, lastHash, data]; `BLOCK_CONTENT_VERSION` = 1 | No error expected |
| POOL_ADOPT_EMPTY | local pool empty, remote map non-empty | local pool equals the remote map | No error expected |
| POOL_MERGE_NONEMPTY | local pool has A,B; remote map has B (same uuid, different object), C | result is {A, B(local), C}; local B survives the collision | No error expected |
| SETMAP_REMOVED | any TransactionPool instance | `setMap` is undefined; no `setMap` call site remains in `src/` | No error expected |
| ROOT_SYNC_GATED | non-empty local chain, root returns a different longer chain | local chain unchanged | No error expected |
| ROOT_BOOTSTRAP | genesis-only local chain, root returns a longer valid chain | local chain replaced with the root chain | No error expected |

</intent-contract>

## Code Map

- `src/main/blockchain/block.js` -- `mineBlock` (line ~44) sorts `data` with the inconsistent comparator `(a,b) => (a.timestamp >= b.timestamp ? 1 : -1)`; `validate` (line ~79) has the non-decreasing-timestamp-only 'Invalid sort order' check. Both switch to the shared canonical sort; the hash input call (line ~117) stays exactly 6 fields.
- `src/main/config.js` -- core config; add `BLOCK_CONTENT_VERSION = 1` and `BLOCK_CONTENT_FIELDS = ['height','uuid','timestamp','miner','lastHash','data']`.
- `src/main/blockchain/transaction-pool.js` -- remove `setMap` (line ~14); add the additive merge method (local wins uuid collisions).
- `src/main/api.js` -- `syncWithRootState` (line ~132) currently calls `blockchain.replaceChain(rootChain)` ungated and `transactionPool.setMap(rootTransactionPoolMap)`. Extract root sync into a new app module with injectable fetch functions (testable without Electron) and apply the empty-chain gate + additive pool merge.
- `src/main/app/root-sync.js` -- NEW. `syncWithRootState({ blockchain, transactionPool, fetchRootChain, fetchRootPool })` — the gate and merge live here; `api.js` wires real `fetch` calls and delegates.
- `src/main/blockchain/block.test.js` -- extend with CANONICAL_HASH_EQUIV, TOTAL_ORDER, WRONG_ORDER_REJECTED, FIELD_SET_PIN.
- `src/main/blockchain/transaction-pool.test.js` -- extend with POOL_ADOPT_EMPTY, POOL_MERGE_NONEMPTY, SETMAP_REMOVED.
- `src/main/app/root-sync.test.js` -- NEW; ROOT_SYNC_GATED and ROOT_BOOTSTRAP with stubbed fetch functions.

## Tasks & Acceptance

**Execution:**
- `src/main/blockchain/block.js` -- extract the shared canonical sort function (timestamp ASC, uuid ASC) and use it in `mineBlock`; replace the validate order check with the total-order check (same error message) -- single source of truth for AD-12 ordering.
- `src/main/config.js` -- add `BLOCK_CONTENT_VERSION` and `BLOCK_CONTENT_FIELDS` -- the versioned pin of the hash field set.
- `src/main/blockchain/transaction-pool.js` -- delete `setMap`; add the additive uuid merge (local entries win collisions) -- no full-replace path remains.
- `src/main/app/root-sync.js` -- NEW module with the empty-chain gate (chain) + adopt/merge (pool), injectable fetches -- root is bootstrap-only (AD-5/AD-13).
- `src/main/api.js` -- delegate `syncWithRootState` to the new module; remove the direct `replaceChain`/`setMap` calls -- one owner for root sync.
- `src/main/blockchain/block.test.js`, `transaction-pool.test.js`, `src/main/app/root-sync.test.js` -- matrix coverage for all nine rows.

**Acceptance Criteria:**
- Given two blocks built from the same logical transactions in different insertion orders, when both are sorted canonically, then their `data` arrays are element-identical and their computed hashes are equal.
- Given a pool on a genesis-only chain and a non-empty remote map, when root sync runs, then the pool adopts the remote map; given a non-empty chain, when root sync runs, then the pool is the uuid union with local entries surviving.
- Given a non-empty local chain, when root sync runs with a different root chain, then the local chain is unchanged.
- Given the pool class, then no `setMap` method or call site exists anywhere under `src/`.

## Design Notes

Canonical sort (the one shared function, exported from `block.js`):

```js
const sortTransactions = data => data.slice().sort((a, b) =>
  a.timestamp !== b.timestamp
    ? (a.timestamp < b.timestamp ? -1 : 1)
    : (a.uuid < b.uuid ? -1 : 1),
)
```

`validate` checks `sortTransactions(this.data)` deep-equals `this.data` (element identity by uuid+timestamp) and throws 'Invalid sort order' otherwise; `mineBlock` assigns `this.data = sortTransactions(this.data)` before hashing. The reward tx shares the block timestamp, so its position among equal-timestamp txs is decided by uuid — deterministic, which is the point.

Root-sync module shape (injectable fetches keep it Electron-free and unit-testable):

```js
const syncWithRootState = async ({ blockchain, transactionPool, fetchRootChain, fetchRootPool }) => {
  const [rootChain, rootPoolMap] = await Promise.all([fetchRootChain(), fetchRootPool()])
  if (blockchain.chain.length === 1) {
    blockchain.replaceChain(rootChain)
  }
  transactionPool.syncFromRemote({ remoteMap: rootPoolMap })
}
```

`syncFromRemote` = `this.transactionMap = { ...remoteMap, ...this.transactionMap }` (local wins collisions; empty local = adoption).

## Verification

**Commands:**
- `npx jest src/main/blockchain/block.test.js src/main/blockchain/transaction-pool.test.js src/main/app/root-sync.test.js --ci` -- expected: all matrix rows pass.
- `npm test` -- expected: full suite green.
- `npm run lint` -- expected: no new findings in touched files.

**Manual checks:**
- `grep -rn "setMap" src/` -- expected: no matches (method and call site gone).
- Inspect `block.js`: hash input call still lists exactly the six pinned fields, in the same positions.

## Review Triage Log

### 2026-09-23 — Review pass
- verdicts: 26 findings — high 0, medium 6, low 6, false 14, maybe-false 0
- findings:
  - `[medium]` `[patch]` (verification-gap, MAIN) api.js root-sync wiring is untested — no test imports `src/main/api.js`, so a broken delegation (wrong singletons, wrong fetch URLs) ships undetected — confirmed: no test imports api.js anywhere; the wiring is the story's new caller-visible contract. Fixed: added `src/main/api.test.js` (mocks electron, electron-is-dev, ./app/root-sync, ./app/pubsub; asserts delegation to the app singletons and fetch URLs `${ROOT_NODE_ADDRESS}/api/blocks` + `/api/transaction-pool-map`). Re-verification green (58/58 focused, 163/163 full, lint 60 baseline).
  - `[medium]` `[defer]` (blind #1) adopted remote pool entries are plain JSON without the Transaction prototype; `validTransactions` drops them — real, but pre-existing: the removed `setMap` had the identical hole (old api.js passed the same `res.json()` map). Deferred; needs a rehydration step at ingestion.
  - `[false]` `[reject]` (blind #2) "reward transaction always last" invariant broken by uuid tie-break — the old comment was descriptive, not normative: no code reads the reward by position (grep: zero `data.length-1`/`.at(-1)` hits), `validate` finds it by `recipient === REWARD_ADDRESS`, and the state fold in `state.js` is per-account (balance/stake) and commutative, so reward position changes no outcome. The spec's design note explicitly accepts uuid-decided reward position as "deterministic, which is the point".
  - `[low]` `[reject]` (blind #3) no test proves reordering changes the hash — the anti-reorder direction is already covered: pre-existing `block.test.js` "should have transactions that are not ordered ASC" flips the data order of a mined block and asserts `Invalid sort order`; the new tie-break test covers the uuid direction. Rejected: the extra test is not worth the cost and the property is pinned.
  - `[false]` `[reject]` (blind #4 + verification-gap other-2) `BLOCK_CONTENT_VERSION`/`BLOCK_CONTENT_FIELDS` are dead constants not fed into the hash — spec-mandated design: the intent's Always bullet fixes a *declarative* pin ("asserted by a test. The constant does NOT enter the hash input"); intent audit R3 confirms the diff implements exactly the reading the intent chose. Not a defect.
  - `[medium]` `[defer]` (blind #5 + edge #1 + intent S6, grouped) root-sync error containment: `Promise.all` couples the two fetches (one failure aborts both), no `response.ok`/shape guards, and `index.js:21` has no catch, so an unreachable root is an unhandled rejection — pre-existing: the old api.js body had un-awaited `.then` chains with the same exposure, and the call site is unchanged by this diff. `Promise.all` is the spec's own design note. Deferred.
  - `[false]` `[reject]` (blind #6) the "no full-replace" test is obfuscated (runtime-composed `'set'+'Map'`) — the intent's Never bullet requires the literal name to survive nowhere under `src/`, so the runtime composition is the only way a test can name the method; the matrix row SETMAP_REMOVED mandates the test. Spec-driven, not a defect.
  - `[false]` `[reject]` (blind #7) root-sync.test.js has dead scaffolding and untested guard paths — the `replaceChain` "incoming chain must be longer" rule is already tested in `src/main/blockchain/index.test.js` (replaceChain describe, not-longer / invalid / valid cases, lines 111–168) and the `chain.length === 1` gate is covered by ROOT_BOOTSTRAP + ROOT_SYNC_GATED. The cited gap is not a gap.
  - `[medium]` `[defer]` (blind #8, grouped with blind #1) `syncFromRemote` accepts an arbitrary object with no per-entry shape validation — real; pre-existing hole carried from `setMap`; same ingestion-point fix as blind #1. Deferred.
  - `[low]` `[reject]` (blind #9) canonical-order check is only sound because the duplicate-uuid check runs first — true, and the dependency is already documented in the code comment ("AD-12: data must already be in the canonical total order — the same order mineBlock applies"); the pool's uuid-keyed map makes duplicate uuids unreachable in practice. Adding a pin test for an unreachable interaction is not worth the cost.
  - `[low]` `[reject]` (blind #10) no adopt/skip logging in the new root-sync owner — `blockchain.replaceChain` still logs the replacement; the skip path is silent, but adding logging to a 10-line bootstrap module is not worth the cost.
  - `[medium]` `[defer]` (edge #2) chain fetch succeeds but pool fetch fails → pool merge skipped, no retry — pre-existing shape (old code fetched the two endpoints independently with no coupling or retry either); `Promise.allSettled` is a containment change owned with the error-handling deferral above. Deferred.
  - `[false]` `[reject]` (edge #3) comparator violates strict weak order when two entries share both timestamp and uuid — unreachable: the pool is a uuid-keyed map so `mineBlock`'s input has unique uuids, and `validate` throws `Duplicate transactions` before the sort check. A comparator that only ever sees distinct keys is a valid strict weak order.
  - `[medium]` `[defer]` (edge #4, claim, medium confidence) HTTP-served root chain is plain JSON; `replaceChain` → `isValidChain` → `block.validate` fails on method-less objects and the chain is silently not adopted — real, but pre-existing: the old api.js passed the same `res.json()` output to `replaceChain`. Pubsub rehydrates; the HTTP root path never did. Deferred.
  - `[false]` `[reject]` (verification-gap other-1) OpenSpec specs are stale (transaction-system `setMap`, api-endpoints full-replace root sync) — verified true as facts (lines 119–120 and 121/125), but this is story 10's (OpenSpec reconciliation + CAP-13) territory, and the fix edits spec files, which this build's rules reject. Deferred to story 10.
  - `[false]` `[reject]` (verification-gap other-3) pre-existing `await api.syncWithRootState()` is a no-op — the new body is `() => syncRootState(...)` (expression body, returns the promise), so the await at `index.js:21` now genuinely awaits root sync; the claim is false for the current code (the old body was the no-op).
  - `[low]` `[reject]` (verification-gap other-4) tied-timestamp hard-fork compatibility edge untested — pre-upgrade chains with same-millisecond pairs are rejected by design (the stricter total order IS the hard fork the intent declares); testing the migration direction is a hard-fork policy question this story does not own. Rejected.
  - `[false]` `[reject]` (intent S1) full-block hash identity is neither achieved nor tested — the intent explicitly excludes it ("No changes to Crypto.hash … (stories 1–4 territory)"; block uuid/timestamp/miner legitimately differ between independently built blocks); the story-owned surface is the data-ordering component, which is tested (CANONICAL_HASH_EQUIV). The intent audit itself names this as the diff exercising the narrower story-owned surface, per the intent.
  - `[false]` `[reject]` (intent S2) pool adoption keyed on the local map, not the chain — the intent's own Always bullet resolves the reading: "One code path serves both cases (merge of an empty local map equals adoption)"; the audit's R4(b) is the reading the intent itself states, and R4(a) is the rejected one.
  - `[false]` `[reject]` (intent S3) field-set pin not mechanically linked to the hash call sites — the intent forecloses a constructed-from-field-list hash ("The constant does NOT enter the hash input") and mandates a value-asserting test; the pin's force is test-literal by design (R3 resolved).
  - `[false]` `[reject]` (intent S4) setMap-removal test exercises a reflective surface, not the lexical one — the lexical surface is enforced by the spec's own manual grep check (`grep -rn "setMap" src/`), which was run and returns no matches; the test is the in-suite complement.
  - `[false]` `[reject]` (intent S5) `syncFromRemote` in core gives core remote-ingestion knowledge — the intent's Never bullet targets the *gate* ("the empty-chain gate lives in the app layer"), and the audit confirms it does (`root-sync.js`); the merge primitive in core is the reading the Always bullet "one code path serves both cases" most naturally supports.
  - `[medium]` `[defer]` (intent S6, grouped with blind #5/edge #1) the new rejection behavior of the fetch surface is untested and unaddressed by the intent — pre-existing exposure (old code: un-awaited `.then` chains, same unhandled rejection); covered by the error-containment deferral above.
  - `[false]` `[reject]` (intent S7) state-application order delta for tied timestamps untested — the state transition is explicitly out of scope ("No changes to … the state transition (stories 1–4 territory)"); the fold in `state.js` is per-account and commutative, so the application order for tied timestamps produces identical state; the intent's hard-fork language covers the validity-set change, which is tested (WRONG_ORDER_REJECTED + tie-break test).

## Auto Run Result

**Summary:** Canonical block contents (AD-12) + bootstrap-only root sync (AD-5/AD-13). `mineBlock` and `validate` now share one canonical total order on block `data` (timestamp ASC, then uuid ASC) via `sortTransactions`; the hash field set is pinned as `BLOCK_CONTENT_VERSION = 1` / `BLOCK_CONTENT_FIELDS` in core config; `TransactionPool.setMap` is deleted and replaced by the additive `syncFromRemote` merge (local wins uuid collisions; empty local map = adoption); root chain sync is gated on genesis-only (`chain.length === 1`) in the new app-layer `root-sync.js` module, with `api.js` as a thin wiring owner.

**Files changed:**
- `src/main/blockchain/block.js` — shared `sortTransactions` (timestamp ASC, uuid ASC, non-mutating); `mineBlock` sorts canonically before hashing; `validate` enforces the total order with 'Invalid sort order'; hash input still exactly the six fields.
- `src/main/config.js` — `BLOCK_CONTENT_VERSION = 1` and `BLOCK_CONTENT_FIELDS` (declarative pin, not a hash input).
- `src/main/blockchain/transaction-pool.js` — `setMap` removed; `syncFromRemote({ remoteMap })` additive uuid merge (local wins).
- `src/main/app/root-sync.js` — NEW: genesis-only chain gate + additive pool merge, injected fetchers (Electron-free).
- `src/main/api.js` — `syncWithRootState` delegates to root-sync with the app singletons and root fetch endpoints.
- `src/main/blockchain/block.test.js` — CANONICAL_HASH_EQUIV, TOTAL_ORDER, WRONG_ORDER_REJECTED (uuid tie-break), FIELD_SET_PIN, `sortTransactions` unit tests.
- `src/main/blockchain/transaction-pool.test.js` — POOL_ADOPT_EMPTY, POOL_MERGE_NONEMPTY, SETMAP_REMOVED.
- `src/main/app/root-sync.test.js` — NEW: ROOT_BOOTSTRAP, ROOT_SYNC_GATED with stubbed fetches.
- `src/main/api.test.js` — NEW (patch): pins the api.js → root-sync wiring (singletons + fetch URLs).

**Review findings breakdown:** 26 findings — 1 patched (medium: api.js wiring untested → `api.test.js` added), 7 findings in 4 deferred entries (medium: HTTP ingestion rehydration/shape validation; root-sync error containment/unhandled rejection; HTTP plain-object root chain; OpenSpec stale specs → story 10), 18 rejected (14 `false` — spec-mandated designs, pre-existing code disproved, or already-covered surfaces; 4 `low` — fixes more than trivial for negligible or unreachable benefit).

**Follow-up review recommendation:** `false` — first pass, no `high` patched, and fewer than two `medium` entries were patched (exactly one).

**Verification performed:**
- `npx jest src/main/blockchain/block.test.js src/main/blockchain/transaction-pool.test.js src/main/app/root-sync.test.js --ci` — 58/58 pass.
- `npm test` — 163/163 pass (14 suites, including the new `api.test.js`).
- `npm run lint` — 60 problems (36 errors, 24 warnings): the pre-existing baseline; no new findings in touched files.
- `grep -rn "setMap" src/` — no matches (method and call site gone).
- `block.js` inspected: hash input call lists exactly the six pinned fields, in the same positions.

**Residual risks:**
- A genesis-only node bootstrapping from the root over HTTP ingests the root pool as plain JSON objects that `validTransactions` cannot validate (pre-existing; deferred) — a fresh node seeded via root HTTP will hold pool entries it cannot mine until rehydration lands.
- Root sync failure (unreachable root, 500, malformed body) is an unhandled rejection at `index.js:21` (pre-existing; deferred) — the window still opens, the node just lacks root-seeded state.
- The root chain over HTTP is never adopted (plain objects fail validation) — bootstrap over HTTP is effectively a no-op for the chain until deserialization lands (pre-existing; deferred). The pubsub path remains the working chain-sync route.
