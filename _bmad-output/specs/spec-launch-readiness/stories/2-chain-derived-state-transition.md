---
title: 'Chain-derived state-transition'
type: 'refactor'
created: '2026-09-21'
 status: 'done'
baseline_revision: '0369db77e1055dcef4cfb90b0630e4e7049cd7d7'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** Account balances are never written by any production path, and `Transaction.validate()` reads the sender's balance from local disk via `new Account({publicKey: this.sender}).retrieve()`. So every user transaction fails "Amount exceeds balance" on every node, reward-only blocks are rejected past height 3, and the chain cannot grow past height 3. There is no deterministic, peer-invariant notion of account state.

**Approach:** Introduce exactly one core state-transition function that derives account state purely from chain contents (a fold over the blocks' transactions), make `Transaction.validate()` check balances against that derived state instead of disk (removing the `retrieve()` read), and thread the derived state through block validation, pool validation, mining, and the transact path. Validation becomes pure over chain contents — same chain ⇒ same state ⇒ same validity on every peer.

## Boundaries & Constraints

**Always:**
- AD-10: exactly ONE core function derives account state from chain contents; it is a pure function (no disk, no fs, no network, no globals mutated) and is the single source of balance truth.
- `Transaction.validate()` never reads local disk; balance sufficiency is checked against the derived state passed in. Structure/crypto checks (key validity, sentinel recipient rules, amount>0, fee>=amount/1000, reward amount==REWARD_AMOUNT, sender!=recipient, signature) are unchanged and remain state-free.
- Money uses `big.js` with integer-unit strings; fee rule stays `fee >= amount/1000`; REWARD_AMOUNT and sentinel addresses come from `src/main/config.js`.
- A reward transaction credits `REWARD_AMOUNT` to the block's `miner`. A transfer debits `amount + fee` from the sender (free balance) and credits `amount` to the recipient and `fee` to the miner. A stake transaction debits `amount + fee` from free balance into a locked `stake`.
- An account not present in the derived state has balance `0` and stake `0` (a missing account is not an error).
- Max cyclomatic complexity 8; no new dependencies; no HTTP/IPC knowledge in the core.

**Never:**
- No disk writes in the derivation path, and no `Account.retrieve()` / `retrieveThrough()` in any validation path.
- No changes to the canonical hash field set, `Crypto.hash`, the block `data` ordering rule, or the tx signature input set (those are other stories).
- No changes to `Wallet.createTransaction` (the only tx constructor) or to how txs are signed.
- No new purchasable privilege or any rule that makes stake gate mining (AD-3).
- No root/authority state; state comes only from the local chain contents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| REPLAY_REWARD | chain with N reward-only blocks (miner M) | M balance = N × REWARD_AMOUNT; no other accounts | No error expected |
| REPLAY_TRANSFER | funded sender S→R amount A fee F | S free -= (A+F); R += A; miner += F | No error expected |
| PURE_DETERMINISM | same chain derived twice | identical state (deep equal); no fs side effects | No error expected |
| UNKNOWN_SENDER | tx from an account absent in state, amount>0 | validate rejects | throws "Amount exceeds balance" |
| INSUFFICIENT | S free < A+F | validate rejects | throws "Amount exceeds balance" |
| STAKE_LOCK | stake tx amount St fee F with free >= St+F | free -= (St+F); stake += St | No error expected |
| STAKE_OVER_10PCT | (free stake+St) > free/10 | validate rejects | throws "Stake too high" |
| FEE_TOO_LOW | fee < amount/1000 | validate rejects (state-free) | throws "Fee invalid" |

</intent-contract>

## Code Map

- `src/main/blockchain/state.js` -- NEW. The single AD-10 state-transition function `deriveState(chain)` (and an internal `applyTransaction(state, tx, miner)`). Pure fold: for each block, for each tx in order, credit/debit per the Always rules. Returns a plain object `{ [publicKey]: { balance, stake } }`. No imports of fs/Account/Obj2fsHOC.
- `src/main/blockchain/transaction.js` -- `validate()` currently calls `new Account({publicKey: this.sender}).retrieve()` (line ~56) for balance/stake. Split into a state-free structure/crypto check plus a balance check against a passed-in `state`. New signature `validate({ state } = { state: {} })`; remove the disk read. `verifySignature()` unchanged.
- `src/main/blockchain/block.js` -- `validate()` (line ~108) maps `this.data` through `transaction.validate()`. Change its signature to `validate({ state } = { state: {} })` and fold `this.data` on the passed-in `state` via the shared transition, passing the running state into each `transaction.validate({ state })`. Structural checks (hash, signature, height, ordering, reward count, dupes) stay. It does NOT re-derive the whole prefix (the caller passes the running state).
- `src/main/blockchain/transaction-pool.js` -- `validTransactions()` calls `value.validate()` with no state (line ~29). Add an optional `state` param `validTransactions({ state } = { state: {} })` and forward it; keep `console.error` filtering behavior.
- `src/main/app/transaction-miner.js` -- `mineTransactions()` calls `transactionPool.validTransactions()`. Derive state from the current chain once and pass it, so intra-block double-spends are caught against the pre-block state.
- `src/main/api.js` -- `/api/transact` calls `transaction.validate()` (line ~103). Derive state from `blockchain.chain` and pass it. (Full typed error envelope is story 7; only the state arg changes here.)
- `src/main/blockchain/index.js` -- `isValidChain` currently validates with `Promise.all(chain.map(block => block.validate()))`. Change to a SEQUENTIAL fold: `state = {}`; for each block, `ok = await block.validate({ state })`; if `ok`, advance `state` by applying that block's `data` (via the shared transition); return false on first failure. `addBlock` derives the prefix state of `this.chain` and passes it to `newBlock.validate({ state })`. `replaceChain` is otherwise unchanged.
- Tests: `src/main/blockchain/transaction.test.js`, `wallet.test.js`, `block.test.js` currently seed balances by writing `Account` files to disk (`account.balance=50; account.store()`). Rewrite those to fund the sender via a mined chain (or an explicit derived state) instead of disk. NEW `src/main/blockchain/state.test.js` for the matrix.

## Tasks & Acceptance

**Execution:**
- `src/main/blockchain/state.js` -- create the pure `deriveState(chain)` fold + `applyTransaction` helper implementing the Always debit/credit rules with `big.js` string math -- single source of balance truth, no disk.
- `src/main/blockchain/transaction.js` -- split `validate()` into a state-free structure/crypto check and a balance check against `state`; change the signature to `validate({ state } = { state: {} })`; delete the `Account(...).retrieve()` disk read -- makes validation pure and peer-invariant.
- `src/main/blockchain/block.js` -- change `validate()` to `validate({ state } = { state: {} })` and fold `this.data` on the passed-in running state, forwarding it to each `transaction.validate({ state })` -- block validity now reflects chain-derived balances.
- `src/main/blockchain/transaction-pool.js` + `src/main/app/transaction-miner.js` -- thread the derived state into `validTransactions({ state })` and derive it once per mine -- pool/mining validate against real balances.
- `src/main/api.js` -- derive state from `blockchain.chain` and pass it to `transaction.validate({ state })` in `/api/transact` -- the transact path enforces real balance.
- `src/main/blockchain/state.test.js` -- NEW tests for every I/O matrix row.
- `src/main/blockchain/{transaction,wallet,block}.test.js` -- replace disk-seeded `Account` balance fixtures with chain-derived funding so the suite exercises the AD-10 path; update the unknown-sender expectation from "No such key or file name found on disk" to "Amount exceeds balance".

**Acceptance Criteria:**
- Given a chain of reward and transfer blocks, when `deriveState` runs, then balances equal starting + rewards - sent, fees credited to the miner, and stake moved to locked — with no fs activity.
- Given the same chain, when derived twice, then the results are deep-equal (pure, deterministic).
- Given a transaction whose sender is absent from the derived state (or short on balance), when `validate({ state })` runs, then it throws "Amount exceeds balance" without any disk read.
- Given a block mined on a funded chain, when `block.validate()` runs, then it passes using chain-derived balances (no disk account files required).
- Given the full suite, when `npm test` runs, then it is green with no test depending on a disk-seeded account balance in a validation path.

## Spec Change Log

## Review Triage Log

## Design Notes

**Data flow (concrete).** The transition rule lives in exactly one place — `applyTransaction(state, tx, miner)` in `state.js` — so AD-10's "one function" invariant is auditable. Two folds reuse it:
- `deriveState(chain)` (exported) folds an entire chain array in order and returns the final state. This is the canonical chain-level state-transition function.
- `block.validate({ state })` folds a single block's `this.data` on top of the passed-in `state` (the running state), validating each tx against the running state as it advances.

Chain-level callers that hold a block array compute the prefix state and pass it down:
- `isValidChain(chain)`: SEQUENTIAL — `state = {}`; for each block, `ok = await block.validate({ state })`; if `ok`, `state = applyBlock(state, block)` (fold `block.data` via `applyTransaction`); return false on first failure. (Replaces the current independent `Promise.all`, which cannot carry running balance.)
- `addBlock`: `prefix = deriveState(this.chain)`; `newBlock.validate({ state: prefix })`.
- `miner.mineTransactions()`: `state = deriveState(blockchain.chain)`; `pool.validTransactions({ state })`.
- `api /api/transact`: `state = deriveState(blockchain.chain)`; `transaction.validate({ state })`.
- `transaction.validate({ state })`: balance check against the given state snapshot (no internal fold).

Balance and stake are stored as `big.js`-compatible integer-unit strings. The unknown-sender error message intentionally changes from the old disk-missing message to "Amount exceeds balance": in the derived model a missing account is a zero-balance account, so the observable failure is insufficient funds, not a filesystem error.

## Verification

**Commands:**
- `npx jest src/main/blockchain/state.test.js` -- expected: all matrix rows pass
- `npm test` -- expected: full suite green (never `npm run test:ci`); no validation-path test writes a disk account to seed a balance
- `npm run lint` -- expected: no new findings

**Manual checks:**
- `grep` the core for `retrieve(` in `transaction.js`/`block.js`/`transaction-pool.js`/`state.js` -- expected: none in a validation path (only `wallet.js getAccount` for display, and api init, remain).

## Review Triage Log

### 2026-09-21 — Review pass
- verdicts: 0 findings — high 0, medium 0, low 0, false 0, maybe-false 0
- findings:
	- No reviewer findings were returned. All four configured review-layer launches failed twice with transient Copilot service transport errors (`ERR_EMPTY_RESPONSE`, `ERR_INCOMPLETE_CHUNKED_ENCODING`, and offline connection errors); the implementation was instead inspected locally against the intent contract and its callers.

## Auto Run Result

### Summary

Implemented deterministic chain-derived account state and threaded the state snapshot through transaction, block, pool, mining, API, and chain validation paths. The single `applyTransaction` transition rule handles rewards, transfers, fees, and stake, while chain validation now folds blocks sequentially.

### Files changed

- `src/main/blockchain/state.js` — added pure state derivation and shared transaction/block transition functions.
- `src/main/blockchain/transaction.js` — removed disk-backed balance lookup and validates against passed state.
- `src/main/blockchain/block.js` — validates transactions against a running block state.
- `src/main/blockchain/index.js` — sequentially validates and applies chain state.
- `src/main/blockchain/transaction-pool.js` — forwards derived state to transaction validation.
- `src/main/app/transaction-miner.js` — derives one chain snapshot for pool validation.
- `src/main/api.js` — validates submitted transactions against chain-derived state.
- `src/main/blockchain/*.test.js` — migrated balance fixtures to chain-derived state and added the eight-row matrix coverage.

### Review findings breakdown

- Patches applied: 0.
- Items deferred: 0.
- Rejected findings: 0.
- The configured external review layers were unavailable after two blocking launch attempts; no layer produced a finding to triage.

### Verification

- `npx jest src/main/blockchain/state.test.js --ci`: 8/8 tests passed.
- `npm test`: 8 suites and 134 tests passed.
- `npm run lint`: 60 existing problems, down from the 62-problem baseline; no new touched-file errors.
- Matrix audit: all 8 I/O rows have passing coverage.
- Manual inspection: validation paths no longer retrieve account state from disk; `deriveState` has no filesystem or network access.

### Residual risks

- The configured subagent review pass could not run because the Copilot service returned transport/offline errors.
- Repository lint still reports 36 errors and 24 warnings outside this story's touched code.
