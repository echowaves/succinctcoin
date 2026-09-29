---
title: 'Miner lottery + autonomous mining'
type: 'feature'
created: '2026-09-21'
status: 'done'
baseline_revision: 'c13b9f66dfcd7f1774502b34f4149817535585d4'
ratified_defaults: { lottery_odds: 1000, mining_recheck_interval_ms: 1000 }
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Mining happens only when something calls `TransactionMiner.mineTransactions()` (the HTTP `/api/mine-transactions` endpoint / renderer button), and every caller mines unconditionally — there is no miner selection, no per-block lottery, and no autonomous mining, so the chain only grows when a human or the UI triggers it.

**Approach:** Add the pinned lottery family (AD-11) as a pure core function — a node wins block h+1 iff `Crypto.hash(prevBlockHash hex, publicKey hex)` (BigInt) is below the threshold derived from the free probability `p`, self-evaluated, peer-invariant — and drive `TransactionMiner` with a fixed re-check interval on which a winning node mines (an empty, reward-only block when the pool is empty) and a losing node does nothing. The HTTP endpoint is retained as a dev-only convenience, not the mining path.

## Boundaries & Constraints

**Always:**
- Lottery family exactly as AD-11: both inputs are hex strings, argument order immaterial (`Crypto.hash` sorts), self-evaluated by each node with its own public key; no peer-set input of any kind (argmin is excluded).
- The winner decision is a pure function of (prevBlockHash, publicKey, odds) — identical on every node for the same inputs; BigInt comparison, no floats in the win check.
- `p` is the single free lottery parameter, owned by core config (`src/main/config.js`), expressed as integer odds `LOTTERY_ODDS` with `p = 1 / LOTTERY_ODDS` so the threshold `2^512 / odds` is exact integer math. Default proposal: `LOTTERY_ODDS = 1000` (open question — ratify at the spec checkpoint).
- The re-check interval is a NEW app-semantic config value in `src/config.js` (`MINING_RECHECK_INTERVAL`, default proposal 1000 ms), distinct from `VALIDATION_RATE`; the miner reads the interval from app config and the odds from core config.
- On each tick the miner reads the local chain head: if it lost the lottery, no block, no broadcast, no pool mutation; if it won, it runs the existing `mineTransactions()` path unchanged (state-validated pool filter, `addBlock`, broadcast, clear).
- `mineTransactions()` itself stays unconditional when called (it is also the dev endpoint's action and the unit-test seam); the lottery gate lives in the tick path only.
- Concurrent ticks never overlap: an in-flight tick suppresses the next one until it settles.
- Max cyclomatic complexity 8; no new dependencies.

**Never:**
- No changes to `Wallet.createTransaction`, block structure, hashing, or the state transition (stories 1–3 territory).
- No stake, stake-gating, or any purchasable privilege in the lottery (AD-3); no proof-of-work (NG4).
- No argmin-over-peers, no peer-set or local-state input to the winner decision.
- No removal of `/api/mine-transactions` — it stays, gated to dev builds.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| PEER_INVARIANCE | same (prevHash, pubkey, odds) evaluated by two independent node instances | identical boolean winner decision for N random inputs | No error expected |
| ORDER_INSENSITIVITY | (prevHash, pubkey) vs (pubkey, prevHash) | same decision (inputs sorted inside Crypto.hash) | No error expected |
| STATISTICAL_SCALING | win rate measured at odds 2 vs 4 over many random prevHashes | odds-4 win rate ≈ half of odds-2, each within a statistical band | No error expected |
| LOSING_TICK | miner not a lottery winner, interval ticks fire | chain length unchanged, no broadcast, pool untouched | No error expected |
| WINNING_TICK | miner is a lottery winner, tick fires | exactly one new block appears, chain broadcast, pool cleared | No error expected |
| EMPTY_POOL_WIN | winner with empty pool | reward-only block mined (chain growth past height 3 without HTTP) | No error expected |
| NOT_STARTED | miner stopped, tick interval elapsed | no blocks produced even for a would-be winner | No error expected |

</intent-contract>

## Code Map

- `src/main/blockchain/lottery.js` -- NEW. Pure core function `isLotteryWinner({ prevBlockHash, publicKey, odds })`: `BigInt('0x' + Crypto.hash(prevBlockHash, publicKey)) < 2n ** 512n / BigInt(odds)`. No fs, no config import (odds passed in).
- `src/main/util/crypto.js` -- `Crypto.hash` (story 1) is the pinned hash family; read-only, do not modify.
- `src/main/config.js` -- core config; add `LOTTERY_ODDS = 1000` (exported, documented as p = 1/odds).
- `src/config.js` -- app/network config; add `MINING_RECHECK_INTERVAL = 1000` (distinct from `src/main/config.js` `VALIDATION_RATE`, which stays untouched).
- `src/main/app/transaction-miner.js` -- add `start()`/`stop()` owning a single `setInterval` (interval from app config); tick handler: in-flight guard → read chain head hash → `isLotteryWinner` with core-config odds and `this.wallet.publicKey` → on win, `mineTransactions()`. Existing `mineTransactions()` body unchanged.
- `src/main/api.js` -- in `init()`, call `transactionMiner.start()` after construction; gate the `/api/mine-transactions` route on `electron-is-dev` (import it, as `src/config.js` already does).
- `src/main/blockchain/lottery.test.js` -- NEW; covers PEER_INVARIANCE (property over random inputs, two independent module-level evaluations), ORDER_INSENSITIVITY, STATISTICAL_SCALING (band assertions, e.g. n=2000, ±5σ).
- `src/main/app/transaction-miner.test.js` -- NEW; jest fake timers (`advanceTimersByTimeAsync`): LOSING_TICK (set `config.LOTTERY_ODDS` high / scan a non-winning head), WINNING_TICK + EMPTY_POOL_WIN (scan random heads until `isLotteryWinner` true at a test-friendly odds, set `config.LOTTERY_ODDS` accordingly, assert chain growth + `broadcastChain` + pool clear), NOT_STARTED.

## Tasks & Acceptance

**Execution:**
- `src/main/blockchain/lottery.js` -- add the pure `isLotteryWinner` function with BigInt threshold math -- single consensus-critical definition of the win rule.
- `src/main/config.js` and `src/config.js` -- add `LOTTERY_ODDS` (core) and `MINING_RECHECK_INTERVAL` (app) -- one owner per value per AD-8; `VALIDATION_RATE` untouched.
- `src/main/app/transaction-miner.js` -- add the autonomous tick loop with the lottery gate, in-flight guard, and clean `start()`/`stop()` -- the app owns liveness, the core owns the rule (AD-1, AD-4).
- `src/main/api.js` -- start autonomous mining in `init()` and gate `/api/mine-transactions` to dev builds -- HTTP becomes a dev convenience, not the mining path.
- `src/main/blockchain/lottery.test.js` -- property + statistical tests for the pinned family -- CAP-3 success signal.
- `src/main/app/transaction-miner.test.js` -- fake-timer tests for the tick behavior -- CAP-4 success signal.

**Acceptance Criteria:**
- Given two independently constructed nodes with the same chain head and different public keys, when each evaluates the lottery for itself, then both compute identical decisions for identical inputs and no decision depends on any peer set.
- Given the miner is started and the node loses the lottery, when multiple re-check intervals elapse, then no block is mined and nothing is broadcast.
- Given the miner is started and the node wins the lottery, when the next interval elapses, then exactly one valid block appears, the chain is broadcast, and mined UUIDs leave the pool.
- Given the miner is stopped, when intervals elapse, then no blocks are produced.

## Design Notes

Odds encoding: `p = 1/LOTTERY_ODDS` with threshold `(2n ** 512n) / BigInt(odds)` keeps the win check exact integer math (project rule: no floats for consensus values) and gives one integer tunable. The tick handler shape:

```js
tick = async () => {
  if (this.mining) return
  this.mining = true
  try {
    const head = this.blockchain.chain[this.blockchain.chain.length - 1]
    if (isLotteryWinner({ prevBlockHash: head.hash, publicKey: this.wallet.publicKey, odds: config.LOTTERY_ODDS })) {
      await this.mineTransactions()
    }
  } finally { this.mining = false }
}
```

Tests mutate the imported `config` objects (`config.LOTTERY_ODDS = ...`) — they are plain mutable default-export objects, consistent with how existing suites use config.

Config-uniformity note (user question, 2026-09-22): neither value enters block validation — eligibility is never verified cross-node (AD-11 tolerates simultaneous winners, AD-14/AD-2 resolve them). Expected mining rate ∝ (1/odds) × (1/interval), so non-identical nodes are asymmetric: the node with the larger product produces more blocks and captures more rewards/fees, and fork pressure rises. `LOTTERY_ODDS` is therefore a **network-uniform consensus parameter** (like PoW difficulty); `MINING_RECHECK_INTERVAL` is a local liveness knob whose uniformity is an assumed deployment property, not an enforced invariant. Enforcing odds in validation would be a hard-fork-level consensus change outside AD-11's scope.

## Verification

**Commands:**
- `npx jest src/main/blockchain/lottery.test.js --ci` -- expected: property + statistical tests pass.
- `npx jest src/main/app --ci` -- expected: miner tick tests and the story-3 suites pass.
- `npm test` -- expected: full suite green; no flakiness in the statistical test at the chosen band.
- `npm run lint` -- expected: no new findings in touched files.

**Manual checks:**
- Inspect `src/main/api.js`: `transactionMiner.start()` called once in `init()`; `/api/mine-transactions` route wrapped in `if (isDev)`.
- Confirm `grep -rn "argmin\|getPeers" src/main/blockchain/lottery.js` is empty — no peer-set input to the rule.

## Review Triage Log

### 2026-09-22 — Review pass
- verdicts: 0 findings — high 0, medium 0, low 0, false 0, maybe-false 0
- findings:
  - No defects found in local review. The diff was judged against the intent contract and callers: the pinned AD-11 lottery is BigInt-only with both inputs as hex strings (order immaterial via `Crypto.hash`'s sort), no peer-set input (grep confirmed empty); the tick gate resets its in-flight flag in `try/finally` and delegates to the unchanged `mineTransactions()` on a win; config ownership splits `LOTTERY_ODDS` (core) from `MINING_RECHECK_INTERVAL` (app) with `VALIDATION_RATE` untouched; the HTTP endpoint is dev-gated and `start()` is called once in `init()`.
  - The configured external review layers (blind-hunter, edge-case-hunter, verification-gap, intent-alignment) could not be launched: the subagent service returned transport/offline errors on the full blocking batch (same failure as stories 2 and 3). Local review performed instead.
  - Note: implementation was authored directly by the orchestrator (not the implementation subagent) after the subagent service returned the same offline/transport errors twice at dispatch; the spec's pinned Design-Notes tick shape and all constraints were followed.

## Auto Run Result

### Summary

Implemented the pinned AD-11 miner lottery and AD-4 autonomous mining. A pure core function `isLotteryWinner({ prevBlockHash, publicKey, odds })` self-evaluates the fixed-odds threshold (`2^512 / odds` via BigInt, no floats, babel-safe `1n << 512n`) over the canonical `Crypto.hash` of two hex strings. `TransactionMiner` now owns a single re-check interval (app-config `MINING_RECHECK_INTERVAL`, distinct from core `VALIDATION_RATE`) on which a winning node runs the existing, unchanged `mineTransactions()` path and a losing node does nothing; an in-flight guard suppresses overlapping ticks. Autonomous mining starts once in `api.init()`, and `/api/mine-transactions` is retained but dev-gated.

### Files changed

- `src/main/blockchain/lottery.js` — NEW; pure `isLotteryWinner` with the exact BigInt threshold math.
- `src/main/blockchain/lottery.test.js` — NEW; PEER_INVARIANCE, ORDER_INSENSITIVITY, and STATISTICAL_SCALING (band) tests.
- `src/main/app/transaction-miner.js` — added `start()`/`stop()`, the `tick` lottery gate, and the in-flight guard; `mineTransactions()` unchanged.
- `src/main/app/transaction-miner.test.js` — NEW; fake-timer tests for LOSING_TICK, WINNING_TICK/EMPTY_POOL_WIN, the in-flight guard, NOT_STARTED, and a real-integration forced win (odds=1).
- `src/main/config.js` — added `LOTTERY_ODDS = 1000` (core, p = 1/odds).
- `src/config.js` — added `MINING_RECHECK_INTERVAL = 1000` (app, distinct from `VALIDATION_RATE`).
- `src/main/api.js` — `transactionMiner.start()` in `init()`; `/api/mine-transactions` wrapped in `if (isDev)`.
- `src/main/app/user-transactions-end-to-end.test.js` — added the `electron-is-dev` mock so the suite loads the app config under Jest.

### Review findings breakdown

- Patches applied: 0. Items deferred: 0. Rejected: 0 (no defects found locally).
- External review layers unavailable due to subagent-service transport errors (one full blocking batch failed identically to stories 2 and 3); local review performed instead.

### Verification

- `npx jest src/main/blockchain/lottery.test.js --ci`: passed (PEER_INVARIANCE, ORDER_INSENSITIVITY, STATISTICAL_SCALING).
- `npx jest src/main/app/transaction-miner.test.js --ci`: passed (LOSING_TICK, WINNING_TICK, in-flight guard, NOT_STARTED, real-integration win).
- `npm test`: 12 suites, 149 tests, all passed.
- `npm run lint`: 60 problems — identical to baseline, zero new in touched files (new import-order/length warnings auto-fixed).
- Matrix audit: PEER_INVARIANCE, ORDER_INSENSITIVITY, STATISTICAL_SCALING, LOSING_TICK, WINNING_TICK, EMPTY_POOL_WIN, NOT_STARTED — all covered by passing tests.
- Manual checks: `grep -rn "argmin\|getPeers" src/main/blockchain/lottery.js` empty; `transactionMiner.start()` once in `init()`; route dev-gated.

### Residual risks

- External subagent review could not run (service transport errors); a follow-up pass is possible once the service recovers.
- `LOTTERY_ODDS` is a network-uniform consensus parameter; a node unilaterally lowering it mines more (asymmetric but not a validation conflict) — recorded in Design Notes.
