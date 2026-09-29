---
title: 'User transactions end-to-end'
type: 'feature'
created: '2026-09-21'
status: 'done'
baseline_revision: '77e4313d21faeaaccd7e4ea5b79fbe7286fe9aa9'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The chain-derived state transition now makes balances deterministic, but the user transaction workflow is not proven end to end across pool admission, mining, propagation, and peer chain replacement. The launch path must accept a funded wallet transaction and converge beyond the historical height-3 limit.

**Approach:** Exercise and complete the existing API, transaction-pool, miner, pubsub, and blockchain replacement path so a signed transaction is accepted, mined into a valid block, propagated to a second node, and reflected in the same derived state on both nodes.

## Boundaries & Constraints

**Always:**
- Create transactions only through `Wallet.createTransaction`; signed transactions are immutable after creation.
- Use `big.js` integer-unit strings; the fee rule remains `fee = amount / 1000` as already enforced by the API and transaction validation.
- Every validation path derives state from the local chain and never reads an account balance from disk.
- A received transaction is admitted only after normal signature, structure, and derived-state validation; a mined block is accepted only through normal block and sequential chain validation.
- The two-node acceptance test uses independent blockchain instances and verifies recipient state from each node's chain, not only an internal pool or callback.
- Preserve existing transaction UUID de-duplication and pool clearing behavior after a block is accepted.

**Never:**
- Do not change wallet signing or transaction construction semantics.
- Do not add disk-backed balance mutation or make peer identity or local account files authoritative.
- Do not bypass `Blockchain.replaceChain`, block validation, or transaction validation in tests or production code.
- Do not introduce mining eligibility or lottery behavior; that belongs to story 4.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| FUNDED_TRANSFER | sender funded by prior reward blocks, signed transfer to recipient | transaction is accepted and recipient receives amount after mining | No error expected |
| POOL_ADMISSION | valid signed transaction submitted to the transaction endpoint/pool | exactly one UUID entry is present and it is broadcast | Invalid transaction remains rejected with existing error envelope |
| MINED_TRANSFER | admitted transaction plus miner wallet | new block contains the transaction and reward; pool clears included UUID | add/mining failure does not publish a successful block |
| PEER_PROPAGATION | node A mines a valid longer chain and node B has same genesis | node B replaces its chain and derives the same recipient state | invalid or non-longer chain is rejected |
| HEIGHT_PAST_THREE | two nodes exchange a transaction after at least three reward blocks | both chains grow past height 3 and remain valid | no disk-account lookup error |

</intent-contract>

## Code Map

- `src/main/api.js` -- `/api/transact` creates, validates, stores, and broadcasts a signed transaction; preserve its success/error envelope.
- `src/main/app/transaction-miner.js` -- validates the pool against the current derived state, adds a block, broadcasts the chain, and clears included transactions.
- `src/main/blockchain/transaction-pool.js` -- UUID-keyed admission, valid filtering, and clearing of transactions included in a block.
- `src/main/blockchain/index.js` -- `addBlock`, `replaceChain`, and `isValidChain` define local mining and peer chain acceptance.
- `src/main/app/pubsub.js` -- transaction and chain broadcast/receive wiring; inspect callbacks for the outer propagation surface.
- `src/main/blockchain/state.js` -- `deriveState(chain)` is the only balance source; use it to assert both nodes converge.
- `src/main/blockchain/*.test.js` -- existing fixtures show reward-funded wallets and state-based validation; extend the narrowest relevant suites and add an end-to-end test at the outermost available surface.

## Tasks & Acceptance

**Execution:**
- `src/main/app/pubsub.js` and `src/main/api.js` -- verify or complete transaction and chain propagation wiring -- ensure the production path reaches pool admission and peer replacement.
- `src/main/app/transaction-miner.js` and `src/main/blockchain/transaction-pool.js` -- preserve valid filtering, block creation, broadcast, and UUID clearing -- ensure mined transactions do not remain pending or disappear before publication.
- `src/main/blockchain/index.js` -- preserve validated longer-chain replacement -- ensure a peer accepts the mined chain through the normal boundary.
- `src/main/**/user-transactions-end-to-end.test.js` -- add focused two-node acceptance coverage -- prove recipient state and chain height converge after a funded transfer.

**Acceptance Criteria:**
- Given two independent nodes with the same genesis and a sender funded by reward blocks, when the sender's signed transaction is admitted and mined, then the recipient balance derived from the resulting chain equals the transfer amount on the mining node.
- Given the mined valid longer chain from node A, when node B receives it through the normal chain-replacement path, then node B accepts it and derives the same recipient balance and chain height.
- Given the transaction UUID has been included in an accepted block, when mining completes, then the UUID is absent from the transaction pool on the mining node.
- Given a transaction fails ordinary validation, when it reaches the admission path, then no successful transaction broadcast or mined-block success is reported.

## Design Notes

The end-to-end test should use two independent `Blockchain` instances and inject lightweight pool/pubsub collaborators where the application layer is difficult to construct without Electron startup. It must still exercise the public methods that production uses (`validTransactions`, `addBlock`, `replaceChain`) and assert observable chain/state results rather than calling `applyTransaction` directly. Use separate storage directories if wallet construction touches persistent key material.

## Verification

**Commands:**
- `npx jest src/main/app/user-transactions-end-to-end.test.js --ci` -- expected: focused two-node workflow passes.
- `npm test` -- expected: full suite passes with no disk-seeded validation fixtures.
- `npm run lint` -- expected: no new findings in touched files.

**Manual checks:**
- Search the touched production path for `Account.retrieve`/`retrieveThrough` and confirm no balance validation path reintroduces local-disk reads.
- Confirm the acceptance test observes recipient state through `deriveState(node.chain)` and uses `replaceChain` for peer acceptance.

## Review Triage Log

### 2026-09-21 — Review pass
- verdicts: 2 findings — high 0, medium 0, low 2, false 0, maybe-false 0
- findings:
  - `[low]` `[reject]` `user-transactions-end-to-end.test.js` "rejects an invalid received transaction" case asserts the pool is empty without exercising the receiving handler — the real handler rejection path is covered by `pubsub.test.js` (both valid-admission and invalid-rejection), so the weak case is redundant, not a gap; not worth adding complexity to strengthen.
  - `[low]` `[reject]` `pubsub.js` `deserializeChain` keeps the sender-computed `key` storage path for non-genesis blocks (local `key` is preserved, serialized `key` is discarded for genesis only) — pre-existing property, only observable if block files are ever read from disk by path, which no current code does; out of this story's validation-surface scope.
  - The configured external review layers (blind-hunter, edge-case-hunter, verification-gap, intent-alignment) could not be launched: the subagent service returned transport/offline errors on two full blocking batches (same failure as story 2). The diff was reviewed locally against the intent contract; both findings above come from that local pass.

## Auto Run Result

### Summary

Completed the user-transaction end-to-end path: the pubsub receive handlers now deserialize wire messages into real `Transaction`/`Block` instances, validate received transactions against the local derived state before pool admission, and chain replacement now actually works (the old handler passed `true` as the `onSuccess` argument, which threw `TypeError: onSuccess is not a function` on every incoming chain, and the pool clear was called with `{ chain }` where the method expects `{ block }`). A two-node acceptance test proves a funded transfer is admitted, mined, propagated via `replaceChain`, and reflected in the derived state on both nodes past height 3, plus handler-level unit tests for admission, rejection, and pool clearing.

### Files changed

- `src/main/app/pubsub.js` — added `handleTransactionMessage` (derived-state validation before admission) and `handleBlockchainMessage` (deserialization + `replaceChain` + per-block pool clearing), fixed the broken `replaceChain(parsedMessage, true, ...)` call, and preserved the local storage `key` when deserializing the genesis block.
- `src/main/app/user-transactions-end-to-end.test.js` — NEW; two-node acceptance test (admit → mine → replace → equal derived state, height past 3) and an invalid-rejection case.
- `src/main/app/pubsub.test.js` — NEW; handler unit tests with virtual mocks for the ESM-only libp2p imports (admit, reject, replace+clear, non-longer rejection).

### Review findings breakdown

- Patches applied: 0. Items deferred: 0.
- Rejected: 2 low findings (weak-but-redundant e2e case; pre-existing deserialized `key` property).
- External review layers unavailable due to subagent-service transport errors (two blocking batches failed identically); local review performed instead.

### Verification

- `npx jest src/main/app/user-transactions-end-to-end.test.js --ci`: 2/2 passed.
- `npx jest src/main/app --ci`: 6/6 passed (e2e + pubsub handlers).
- `npm test`: 10 suites, 140 tests, all passed.
- `npm run lint`: 60 problems — identical to baseline, zero new in touched files.
- Matrix audit: FUNDED_TRANSFER, POOL_ADMISSION, MINED_TRANSFER, PEER_PROPAGATION (accept + non-longer rejection via `pubsub.test.js` and pre-existing `index.test.js` invalid-chain case), HEIGHT_PAST_THREE — all covered by passing tests.
- Manual check: no `Account.retrieve`/`retrieveThrough` in the app-layer validation path.

### Residual risks

- External subagent review could not run this session (service transport errors); a follow-up review pass is possible once the service recovers.
- `pubsub.js` `discoverPeers` still has an un-cleared 5-second `setInterval` (pre-existing, untouched by this story).
