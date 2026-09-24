---
title: 'Typed error flow'
type: 'feature'
created: '2026-09-23'
status: 'done'
baseline_revision: '797a4a423c01daec86f04d95b7f9363f19cb6c58'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
deferred:
  - summary: >-
      Full-core typed-error coverage: block.js (11 throws, incl. the untyped
      'Duplicate transactions' at block.js:88-90 and 'Invalid hash' at block.js:139)
      and account.js (2 throws) still throw plain Error, so the same user-facing
      message is 409 from /api/transact but 500 from any other HTTP surface.
    evidence: |-
      Verified against block.js and account.js at this story's baseline; the
      intent's Never list explicitly quarantines block.js and the Approach scopes
      typing to transaction-level throws. Routes to the AD-9 full-core typing story.
    location: >-
      src/main/blockchain/block.js, src/main/blockchain/account.js
    severity: medium
  - summary: >-
      /api/transact destructures req.body outside any try/catch: a POST without a
      JSON body (req.body undefined) throws a TypeError that escapes the handler
      instead of returning the documented 500 envelope.
    evidence: |-
      Pre-existing: the baseline handler at 797a4a4 destructured req.body
      identically outside any guard. A body-shape guard is a new validation rule
      the intent's Never list forbids. Routes to a request-validation story.
    location: >-
      src/main/api.js
    severity: medium
  - summary: >-
      Peer-transaction admission (PubSub.handleTransactionMessage) has no
      pending-duplicate check, so a peer can broadcast two same-sender pending
      transactions; both are pooled and mined into one block, which block
      validation (running-state re-validation) then rejects — a network-reachable
      mining stall with no test asserting adoption at that site.
    evidence: |-
      Verified: pubsub.js handleTransactionMessage validates then setTransaction
      unconditionally; no test pre-seeds a same-sender pool entry. Pre-existing
      and the intent's Never list excludes the pool-merge/root-sync surface; the
      local 409 is the specified surface. Candidate: story 10 two-node
      convergence work or a peer-admission hardening story.
    location: >-
      src/main/app/pubsub.js
    severity: medium
  - summary: >-
      The /api/transact route registration itself is never executed by any test;
      a deregistered or mis-wired route (wrong singleton) would ship with the
      suite green.
    evidence: |-
      No supertest (spec forbids new deps); api.test.js covers only
      syncWithRootState and transact.test.js covers the extracted function.
      Pre-existing wiring-gap class — the same root-sync wiring gap was deferred
      from story 5. Consolidate in a supertest-based wiring story.
    location: >-
      src/main/api.js
    severity: low
  - summary: >-
      Blockchain.addBlock swallows every block-level validation error to stderr
      and returns null, so a block-timestamp-rule regression surfaces as silent
      null returns (and if (block) no-ops) rather than a test failure.
    evidence: |-
      Verified: index.js addBlock writes 'addBlock error: ...' to stderr and
      returns null. The intent's Never list carves out the core's
      console/process.stderr logging leaks as AD-9 logging hygiene, a separate
      story; pre-existing.
    location: >-
      src/main/blockchain/index.js
    severity: low
---

<intent-contract>

## Intent

**Problem:** The core throws untyped `Error`s and the app's `/api/transact` catches everything and returns a blanket `400` with `{type:'error', message}` — no `code`, no status differentiation (insufficient balance and a corrupt signature both read as "400"), and a double-spend candidate (a second pending tx from a sender that already has one in the pool) is silently accepted, poisoning the next block. CAP-9/AD-9/C11 require the core to throw typed errors with stable codes and the app layer to map them to the documented envelope `{type:'error', code, message}` with the status map: duplicate→409, insufficient balance→402, invalid hash/signature→400, unexpected→500 — with no HTTP knowledge in the core.

**Approach:** Introduce a small core `BlockchainError` (message + stable `code`) and type the transaction-level throws with it (messages unchanged). Add a pure app-layer mapper from error→`{status, body}` implementing the documented status map, extract the `/api/transact` handler into a testable pure function, add the pending-duplicate check (409), and route the catch through the mapper.

## Boundaries & Constraints

**Always:**
- Core errors carry a stable string `code`; the core never names an HTTP status. The app layer owns all status mapping (AD-9).
- The status map is exactly: `duplicate-transaction`→409, `insufficient-balance`→402, `invalid-transaction`/`invalid-signature`/`invalid-hash`→400, anything else→500 with code `unexpected-error`.
- Every error response is the envelope `{type:'error', code, message}`; the success response stays `{type:'success', transaction}`.
- Existing transaction error messages are preserved verbatim ('Amount exceeds balance', 'Invalid transaction signature', 'Sender invalid', 'Fee invalid', etc.) — existing tests assert them.
- A transaction is rejected as a duplicate (409) when the pool already holds a pending transaction from the same sender; the check runs after chain-state validation and before the pool is mutated.
- A malformed (non-numeric) `amount` is rejected with 400 (code `invalid-transaction`) before any transaction is created — preserving today's 400 for bad input.
- The fee remains auto-calculated as `amount/1000` via big.js; the client never supplies it.

**Never:**
- No HTTP/IPC/status knowledge in `src/main/blockchain/` (the mapper lives in `src/main/app/`); a static test proves it.
- No changes to block-level validation (`block.js`), `addBlock`/`replaceChain`/`isValidChain`, the state transition, the pool merge/root-sync, the miner, or the renderer. The core's remaining `console`/`process.stderr` logging leaks are AD-1/AD-9 logging hygiene, a separate story.
- No new dependencies (no supertest — the handler is tested as an extracted pure function with stubbed `req`/`res`).
- No changes to the transaction signature input set or `Crypto.hash`.
- No new validation rules beyond the pending-duplicate check (e.g., no integer-amount enforcement).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| TRANSACT_SUCCESS | funded sender, valid recipient, amount '50', empty pool for sender | 200 `{type:'success', transaction}`; tx in pool; broadcast called once | No error |
| TRANSACT_INSUFFICIENT | unfunded sender, amount '50' | 402 `{type:'error', code:'insufficient-balance', message}`; pool unchanged | typed insufficient-balance |
| TRANSACT_DUPLICATE | funded sender with an existing pending tx in the pool, new valid amount | 409 `{type:'error', code:'duplicate-transaction', message}`; pool still holds only the first tx | typed duplicate |
| TRANSACT_INVALID_SIGNATURE | funded sender, created tx's signature corrupted before validation | 400 `{type:'error', code:'invalid-signature', message}`; pool unchanged | typed invalid-signature |
| TRANSACT_UNEXPECTED | `createTransaction` throws a generic `Error` | 500 `{type:'error', code:'unexpected-error', message}`; pool unchanged | unmapped → 500 |
| TRANSACT_MALFORMED_AMOUNT | amount `'abc'`, funded sender | 400 `{type:'error', code:'invalid-transaction', message:'Amount invalid'}`; no tx created, no broadcast | pre-check before creation |
| MAPPER_INVALID_HASH | `BlockchainError('Invalid hash', 'invalid-hash')` | mapper returns status 400 with code `invalid-hash` | full documented map |
| NO_HTTP_IN_CORE | any `.js` (non-test) file under `src/main/blockchain/` | none contains HTTP status logic tokens (`res.status`, `express`, `httpStatus`) | static check |

</intent-contract>

## Code Map

- `src/main/blockchain/transaction.js` -- `validateStructure` (line ~29), `validateState` (line ~66), `validate` (line ~89) throw plain `new Error(...)` with the messages the existing tests pin; type these with `BlockchainError` (messages verbatim).
- `src/main/blockchain/errors.js` -- NEW: `BlockchainError extends Error` with a `code` property + the stable code constants (`duplicate-transaction`, `insufficient-balance`, `invalid-transaction`, `invalid-signature`, `invalid-hash`).
- `src/main/app/error-mapper.js` -- NEW: pure `mapErrorToResponse(error)` → `{status, body:{type:'error', code, message}}` implementing the documented map; non-typed errors → 500/`unexpected-error`.
- `src/main/api.js` -- `/api/transact` route (line ~95): extract the body into an exported `transact({ blockchain, wallet, transactionPool, pubsub, req, res })`; add the amount pre-check (Big construct → 400 `invalid-transaction` on failure), the pending-duplicate check via `transactionPool.existingTransaction({ sender })` (409), and route the catch through the mapper. Success path, fee calc, set-then-broadcast order unchanged.
- `src/main/blockchain/transaction-pool.js` -- `existingTransaction({ sender })` (line ~20) is the reuse point for the duplicate check. Read-only.
- `src/main/app/transact.test.js` -- NEW: matrix handler rows (success, insufficient, duplicate, invalid-signature, unexpected, malformed-amount) with a real funded `Blockchain` + real `Wallet` (funding via reward blocks, AD-10) and stubbed `req`/`res`/`pubsub`; mocks `electron`, `electron-is-dev`, `./app/root-sync`, `./app/pubsub` (same set as `api.test.js`).
- `src/main/app/error-mapper.test.js` -- NEW: mapper rows (each code → status, invalid-hash → 400, unknown → 500, envelope shape).
- `src/main/blockchain/core-http-free.test.js` -- NEW: static check that no non-test file under `src/main/blockchain/` contains HTTP status tokens (tokens composed at runtime so the test itself introduces no literal under `src/`).
- `src/main/api.test.js` -- existing root-sync wiring test; must keep passing unchanged (the `transact` extraction does not touch the `syncWithRootState` wiring).

## Tasks & Acceptance

**Execution:**
- `src/main/blockchain/errors.js` -- NEW `BlockchainError` (message + stable `code`) and code constants -- the typed-error primitive the core throws and the app maps.
- `src/main/blockchain/transaction.js` -- replace the transaction-level `throw new Error(...)` sites with `BlockchainError` using the matching code (`Amount exceeds balance`→`insufficient-balance`, `Invalid transaction signature`→`invalid-signature`, all other structure/state errors→`invalid-transaction`); messages verbatim.
- `src/main/app/error-mapper.js` -- NEW pure `mapErrorToResponse` implementing the documented status map (409/402/400/500) and the envelope shape.
- `src/main/api.js` -- extract `transact` (export it), add the amount pre-check and the pending-duplicate check, route the catch through the mapper -- the app layer becomes the single owner of the HTTP envelope.
- `src/main/app/transact.test.js`, `src/main/app/error-mapper.test.js`, `src/main/blockchain/core-http-free.test.js` -- matrix coverage: all handler rows, all mapper rows, the no-HTTP-in-core static check.

**Acceptance Criteria:**
- Given each failure condition (duplicate, insufficient balance, invalid signature, unexpected), when `POST /api/transact` fails, then the response is the envelope with the documented status and a stable `code` — 409, 402, 400, 500 respectively.
- Given a sender with an existing pending transaction, when they submit another, then the pool is unchanged and the response is 409.
- Given any non-test file under `src/main/blockchain/`, when scanned, then it contains no HTTP status logic — the core throws, the app maps.

## Incidental test-stability repairs (out of typed-error scope)

Two pre-existing flaky tests break the "full suite green" gate non-deterministically (both are AD-12 side effects: the canonical block sort makes the reward tx share the block timestamp, so same-millisecond ordering is uuid-random). Repaired to keep the verification gate deterministic; neither touches typed-error behavior:

- `src/main/blockchain/block.test.js` -- "timestamp of each transaction ... less than the block's timestamp": `toBeGreaterThan` → `toBeGreaterThanOrEqual`. `block.js validate` rejects only when the block timestamp is *strictly less* than a non-reward tx timestamp; a same-millisecond tx is legitimate. The comment now also documents the reward-tx asymmetry (reward must equal exactly) so the `recipient !== REWARD_ADDRESS` guard is not "simplified" away. Caught flaking (failed 1 of 25 full-suite runs).
- `src/main/blockchain/account.test.js` -- stakeTimestamp assertion was flaking because the 1 ms pre-sleep does not reliably advance the millisecond clock. Fixed by matching the proven `subtractStake` sibling: 10 ms sleep + strict `toBeGreaterThan` (the assertion is *stronger* than the original; no weakening).

## Spec Change Log

- 2026-09-23: implementation complete; recorded the two incidental test-stability repairs above (both pre-existing flakes, unrelated to typed errors).

## Review Triage Log

### 2026-09-23 — Review pass

- verdicts: 24 findings — high 0, medium 6, low 17, false 0, maybe-false 1
- findings:
  - `[low]` `[patch]` Blind-1: `ERROR_CODES.INVALID_HASH` looks like dead code because the only `'Invalid hash'` throw (block.js:139) is untyped — verified true, but the spec's Design Notes settle it: `block.js` is intent-excluded (Never list) and the mapper must implement the full documented map even though the current HTTP surface never raises `invalid-hash`; the row `MAPPER_INVALID_HASH` is mapper-surface by construction. Not a defect — the constant is the documented code set, not a liveness promise. No action.
  - `[medium]` `[defer]` Blind-2: `block.js` (11 throws, incl. the untyped `'Duplicate transactions'`) and `account.js` (2 throws) remain plain `Error`, so the same user-facing message is 409 from `transact` but 500 from any other path — verified real (block.js:88-90, 139; account.js throws). Pre-existing, and the intent's Never list explicitly quarantines `block.js`; `account.js` is out of "transaction-level" scope (Approach). Routes to the AD-9 full-core-typing story.
  - `[medium]` `[patch]` Blind-3: `transact`'s two manual `mapErrorToResponse(new BlockchainError(...))` + respond-and-return sites duplicate the catch's pattern and risk message drift — verified. Patched: the pre-check and duplicate branches now `throw` the typed `BlockchainError` and the single `catch` does all mapping, so there is exactly one respond site. Behavior-preserving (verified: full matrix re-runs green, same statuses/codes/messages).
  - `[low]` `[reject]` Blind-4: success path never calls `res.status(200)`, so the envelope is "half-owned" — verified true, but Express defaults to 200 and the matrix row `TRANSACT_SUCCESS` pins the current behavior; forcing explicit 200 would change a pinned test for a hypothetical future refactor. Not worth the complexity.
  - `[low]` `[patch]` Blind-5: the "pure function" JSDoc on `transact` oversells (it mutates the pool, broadcasts, writes I/O) — verified; patched the comment to "dependency-injected, testable without a server; not side-effect-free".
  - `[low]` `[patch]` Blind-6: the `fund()` helper's load-bearing `3` is undocumented against the `block.js` `height > 3` reward-only gate — verified (block.js:76); patched a comment explaining the ceiling.
  - `[low]` `[reject]` Blind-7: no test for `recipient === undefined` (→ 400 `'Recipient invalid'`) — the path is exercised transitively by `transaction.test.js` structure tests and the mapper's 400 rows; adding a handler row duplicates coverage the spec's matrix does not require. Not worth the added surface.
  - `[medium]` `[defer]` Blind-8: `req.body === undefined` (POST without a JSON body) destructures outside any try/catch and escapes the handler — verified real, but the baseline handler already destructured `req.body` identically outside any guard (pre-existing, not introduced by this diff). A body-shape guard is a new validation rule the intent's Never list forbids ("no new validation rules beyond the pending-duplicate check"). Routes to a request-validation story.
  - `[low]` `[reject]` Blind-9: mapper loses the message for thrown non-Error primitives (`throw 'oops'` → `'Internal server error'`) — verified, but the null case is pinned and the spec's matrix covers only `Error`/`BlockchainError` inputs; a primitive-throw row guards behavior no code path produces. Not worth it.
  - `[low]` `[reject]` Blind-10: `core-http-free.test.js` is a token scan, not an AST check (renamed aliases / bracket access pass) — verified, and the spec's matrix row `NO_HTTP_IN_CORE` prescribes exactly this token scan; upgrading to AST is a new dependency or a large rewrite. The heuristic is the specified control.
  - `[low]` `[reject]` Blind-11: the `./pubsub` mock in `transact.test.js` is a bare `jest.fn()` that a future `init()`-calling test would trip on — the mock set is deliberately identical to `api.test.js` (documented in-file); the failure mode is hypothetical future work, not a current defect.
  - `[low]` `[patch]` Blind-12: the flake-fix comment in `block.test.js` omits the reward-tx asymmetry (`validate` requires reward `===` block timestamp, non-reward `>=`) that the test's guard silently depends on — verified against `block.js:98-101`; patched the comment to document the asymmetry so the guard is not removed.
  - `[maybe-false]` `[defer]` Edge-1: `req.body` undefined/null destructuring — same root cause as Blind-8 (pre-existing unguarded destructure; a guard is a forbidden new validation rule). The baseline already had the identical unguarded line, so it is not this story's defect; settled by reading baseline `api.js` at `797a4a4`. Shares Blind-8's defer.
  - `[medium]` `[patch]` Edge-2: `STATUS_BY_CODE[code]` lookup with a prototype-chain key (e.g. an error whose string `code` is `'constructor'`) passes the `typeof code === 'string'` guard, then `STATUS_BY_CODE['constructor']` resolves through the prototype chain to `Object.prototype.constructor` — a truthy function — so `status || 500` keeps the function and `res.status(<function>)` is called with no envelope. Verified real; patched with `Object.hasOwn(STATUS_BY_CODE, code)`.
  - `[medium]` `[defer]` VG-1: the pending-duplicate check is not adopted at `PubSub.handleTransactionMessage` (pubsub.js:183-188), so a peer can broadcast two same-sender pending txs; both are pooled, the miner puts both in one block, and block validation (running-state re-validation, block.js:114-121) rejects the block — a mining stall reachable over the network, with no test asserting adoption at that site. Verified real. Pre-existing (the site predates this story) and the intent's Never list excludes "the pool merge/root-sync" and any change beyond the local endpoint; the local 409 is the specified surface (`TRANSACT_DUPLICATE`). Routes to a peer-admission hardening story (candidate: story 10's two-node convergence work).
  - `[low]` `[defer]` VG-2: the `/api/transact` route registration itself (api.js:152-154) is never executed by any test — a deregistered or mis-wired route ships green. Verified (no supertest; `api.test.js` covers only `syncWithRootState`; `transact.test.js` covers the extracted function). Pre-existing class of gap — the same root-sync wiring gap was already deferred from story 5 (`5-canonical-block-contents-pool-sync.md`); a supertest-based wiring story is the consolidation point.
  - `[low]` `[patch]` VG-3: the relaxed `stakeTimestamp` assertion (`toBeGreaterThanOrEqual`) now also passes if `addStake` never updated the field at all — verified: with a 1 ms sleep, same-ms updates are legitimate, so strict `>` flakes, but `>=` loses the "it updated" signal. Patched by matching the proven `subtractStake` sibling: 10 ms sleep (reliably advances the ms clock) + strict `toBeGreaterThan` — the assertion is restored to (in fact stronger than) its original form, so no weakening remains.
  - `[low]` `[reject]` VG-4: `addBlock` swallows block-level validation errors to stderr + `null`, so a block-timestamp-rule regression would surface as silent `null` returns — verified (index.js:22-25), but this is the documented AD-9 logging-hygiene surface the intent's Never list carves out ("the core's remaining console/process.stderr logging leaks are … a separate story") and it predates this change. Not this story's problem.
  - `[low]` `[reject]` IA-1: divergence 1 — the incidental test relaxations sit at a surface the intent never mentions — the intent-contract does not forbid *test* repairs required for a deterministic verification gate (the spec's own `npm test` gate); both repairs are now documented in the spec's "Incidental test-stability repairs" section and, post-triage, the `account.test.js` assertion is strictly stronger than baseline. Not a spec gap.
  - `[low]` `[reject]` IA-2: divergence 2 — `invalid-hash` and block-level `duplicate` exist only at the mapper surface (the core never emits them) — same root cause as Blind-1: the spec's Design Notes settle that the mapper implements the full documented map regardless of current throw sites. No action.
  - `[medium]` `[defer]` IA-3: divergence 3 — the double-spend guard lives at the local endpoint only; the network admission surface (`handleTransactionMessage`) and the block-formation defense (untyped block.js duplicate throw) are unguarded — same root cause as VG-1 (network admission) plus the Blind-2 deferral (block-level typing). Verified real; pre-existing + intent-excluded.
  - `[low]` `[reject]` IA-4: divergence 4 — a strict reading of "preserving today's 400" could preserve Big's raw RangeError text; the diff normalizes to `'Amount invalid'` — the matrix row `TRANSACT_MALFORMED_AMOUNT` pins `message: 'Amount invalid'` verbatim, so the matrix resolves the ambiguity and the diff follows it. No action.
  - `[low]` `[reject]` IA-5: divergence 5 — the duplicate check runs after the *entire* `validate()` (structure+signature+state), so a duplicate-with-bad-signature yields 400 not 409; the intent is silent on precedence and the matrix uses a fully valid tx — the diff picked a defensible ordering (validation errors take precedence, which is also the safer order). No action.
  - `[low]` `[reject]` IA-6: divergence 6 — `account.js` throws remain untyped and would map to 500 if they reached the catch — same root cause as Blind-2 (transaction-level scoping; account errors are out of scope). No action.

## Design Notes

The mapper keys off the error's `code` property only (duck-typed) — the app layer does not need to import the error class, only the documented code set, which keeps the mapping table in one place:

```js
const STATUS_BY_CODE = {
  'duplicate-transaction': 409,
  'insufficient-balance': 402,
  'invalid-transaction': 400,
  'invalid-signature': 400,
  'invalid-hash': 400,
}
```

The duplicate check is a real correctness fix, not just a status: validation runs against the derived *chain* state, so a second pending tx from the same sender passes validation and would be pooled — the miner would then put both in one block and the double-spend would fail block validation, stalling mining. Rejecting at submission (409, pool untouched) is the defensible surface. `invalid-hash` is mapped per the documented map even though the current HTTP surface only raises signature/structure errors — block-level hash checks are not on the transact path, and the mapper must implement the full documented map.

The amount pre-check constructs `Big(amount)` before `createTransaction` and returns 400/`invalid-transaction`/`Amount invalid` on failure — preserving today's 400 for malformed input (a `Big` throw inside the catch would otherwise map to 500) without depending on big.js's internal error type.

## Verification

**Commands:**
- `npx jest src/main/app/transact.test.js src/main/app/error-mapper.test.js src/main/blockchain/core-http-free.test.js src/main/api.test.js --ci` -- expected: all matrix rows pass.
- `npm test` -- expected: full suite green (existing message-asserting tx tests keep passing).
- `npm run lint` -- expected: no new findings in touched files.

**Manual checks:**
- `grep -rn "res.status" src/main/blockchain/` -- expected: no matches.
- Inspect `/api/transact`: success path, fee calc, and set-then-broadcast order unchanged from before.

## Auto Run Result

**Status:** done (first pass)

**Summary:** The core now throws typed `BlockchainError`s with stable codes at the transaction surface (`transaction.js`), and the app layer owns the full AD-9 HTTP envelope: a pure, duck-typed `error-mapper` implements the documented status map (duplicate→409, insufficient-balance→402, invalid-transaction/invalid-signature/invalid-hash→400, anything else→500 `unexpected-error`), the `/api/transact` handler is extracted into the injected `transact()` with a single catch that does all mapping, a malformed-amount pre-check returns 400 before any transaction exists, and a pending-duplicate check rejects a second same-sender pool entry with 409 before the pool is mutated. A static test proves no HTTP tokens under `src/main/blockchain/`.

**Files changed:**
- `src/main/blockchain/errors.js` (new) -- `BlockchainError` (message + stable `code`) + the five documented `ERROR_CODES`.
- `src/main/blockchain/transaction.js` -- all 13 transaction-level throws typed with `BlockchainError`; messages verbatim.
- `src/main/app/error-mapper.js` (new) -- pure `mapErrorToResponse`; `Object.hasOwn`-guarded status table; untyped/undocumented → 500 `unexpected-error`.
- `src/main/api.js` -- `transact()` extracted and exported (DI); amount pre-check (400), pending-duplicate check (409), single-catch mapping through the mapper; success path/fee/set-then-broadcast unchanged.
- `src/main/app/transact.test.js` (new) -- 6 handler matrix rows with real `Blockchain`/`Wallet`/`TransactionPool`, stubbed `req`/`res`/`pubsub`; `fund()` ceiling documented.
- `src/main/app/error-mapper.test.js` (new) -- full documented map, undocumented code, untyped `Error`, `null`, envelope shape.
- `src/main/blockchain/core-http-free.test.js` (new) -- static no-HTTP-tokens scan of non-test core files.
- `src/main/blockchain/account.test.js` (incidental) -- stakeTimestamp flake: 10 ms sleep + restored strict `toBeGreaterThan` (stronger than baseline).
- `src/main/blockchain/block.test.js` (incidental) -- tx-vs-block timestamp assertion relaxed to `>=` to match `validate` semantics (same-ms legitimate); comment documents the reward-tx `===` asymmetry.

**Review findings breakdown (24 findings):**
- Patches applied: 6 — Blind-3 (consolidate `transact` to a single catch/mapping path), Edge-2 (`Object.hasOwn` guard against prototype-chain status codes), VG-3 (restore strict `stakeTimestamp` assertion with a reliable 10 ms sleep), Blind-5 (correct the "pure function" comment), Blind-6 (document the `fund()` height-ceiling), Blind-12 (document the reward-tx timestamp asymmetry in the flake comment).
- Deferred: 5 entries / 6 rows — full-core error typing (`block.js`/`account.js` still untyped; Blind-2, IA-6); unguarded `req.body` destructure (pre-existing; guard is a forbidden new validation rule; Blind-8, Edge-1); peer-admission duplicate gap at `PubSub.handleTransactionMessage` (pre-existing; network double-spend → invalid block; VG-1, IA-3); `/api/transact` route-registration never exercised by a test (pre-existing wiring-gap class, cf. story 5 root-sync deferral; VG-2); `addBlock` stderr-swallow of block validation errors (AD-9 logging hygiene; VG-4).
- Rejected: 12 — Blind-1 (invalid-hash documented-map row settled by Design Notes), Blind-4 (explicit 200 not required), Blind-7 (missing-recipient row redundant with existing coverage), Blind-9 (primitive-throw mapper row out of matrix), Blind-10 (token scan is the specified control), Blind-11 (hypothetical future `init()` test), IA-1 (test repairs documented in spec), IA-2 (= Blind-1), IA-4 (matrix pins 'Amount invalid'), IA-5 (validation-before-duplicate precedence defensible), IA-6 (= Blind-2).

**Follow-up review recommendation:** `true` (first pass; two `medium` entries patched: Blind-3, Edge-2). Unverified risk named: the refactored single-catch `transact` control flow — every typed throw (pre-check, duplicate, core) now funnels through one catch; the matrix re-runs green, but the new control flow has not had a second independent review pass. Secondary: the restored strict `stakeTimestamp` assertion assumes timer resolution ≤ 10 ms (same assumption the pre-existing `subtractStake` sibling makes).

**Verification performed:**
- Focused: `npx jest src/main/app/transact.test.js src/main/app/error-mapper.test.js src/main/blockchain/core-http-free.test.js src/main/api.test.js --ci` → 17/17 (16/16 after the transact.test.js comment patch; api.test.js 1).
- `npm test` → 193/193 on repeated runs (incl. 5 consecutive after the flake repairs; 16+ consecutive across the story).
- Flake-stability loops: `block.test.js`+`index.test.js`+`account.test.js` 10× → 93/93 each; `account.test.js`+`block.test.js` 8× → 67/67 each.
- `npm run lint` → 60 problems (36 errors, 24 warnings) = baseline; no new findings in touched files.
- `grep -rn "res.status" src/main/blockchain/` → no matches.
- Matrix audit: all 8 spec matrix rows covered by tests (6 handler rows + mapper row + static row).

**Residual risks:**
- The peer-transaction admission path (`PubSub.handleTransactionMessage`) still accepts a second same-sender pending tx; it now reliably produces an *invalid* block (mining stall) rather than an over-spend, because block validation advances a running state — deferred to a peer-admission hardening story.
- `block.js`/`account.js` errors remain untyped and map to 500 if they ever reach an HTTP surface — deferred to the full-core typing story.
- The `transact` route registration itself is not exercised by any test (no supertest; spec forbids new deps) — deferred with the story-5 wiring-gap class.
