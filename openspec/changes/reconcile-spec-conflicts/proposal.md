# Reconcile Spec Conflicts and Close Behavioral Gaps

## Why

A full review of the `openspec/specs` set (adversarial, edge-case, structure, and prose lenses) surfaced several problems that make the specs unreliable as an implementation contract:

- **Cross-spec contradictions** that no implementation can satisfy as written:
  - `blockchain-core` and `configuration` define two *different canonical genesis blocks* (`lastHash="none"/hash="hash-one"` vs `lastHash="GENESIS"/hash="GENESIS"`), so a peer chain built on one is rejected by the other as invalid genesis — breaking initial sync and consensus.
  - `transaction-miner` requires reward-only blocks on an empty pool, but `blockchain-core` rejects reward-only blocks at height > 3.
  - `transaction-system`'s stake rule (`amount >= 200 AND <= 10% of balance`) is partly impossible: no stake is ever valid below a balance of 2000.
  - The transaction **fee** and **pagination** contracts are each described three different ways across `api-endpoints`, `electron-app`, and `renderer-ui`.
- **Undefined behavior** that inverts the incentive model or loses funds: reward crediting is unspecified (a naive implementation makes the miner *lose* 100 coins), reward-only reward transactions have no fee/balance handling defined, and the wallet has no backup/recovery spec.
- **Missing edge cases** across every spec: negative/zero amounts, empty collections, out-of-range pages, null/undefined inputs, big.js-vs-float arithmetic, malformed P2P messages, corrupted wallet files, and UI rendering of empty/short values.
- **Cross-spec constant duplication**: reward identity, stake minimum, channel names, and dev-mode storage paths each appear in multiple specs at different layers.
- **Structural redundancy (~500 words)**: whole requirements re-specify the same endpoints/scenarios already owned by another spec, and one requirement (`electron-app: Electron window management`) buries multiple MUST/SHALL constraints in a prose paragraph instead of the BDD schema.
- **A stale "(Electron 28)" reference** in `build-tooling` (the rest of `build-tooling` already asserts Electron 42.x, so the single "Electron 28" scenario is the inconsistency). Note: the "substract" spelling in `account-management`'s overdraw/over-stake errors is a real typo, but the source (`src/main/blockchain/account.js`) still uses "substract" too, so it is intentionally left as-is to keep the spec quoting the actual runtime literal; it is outside this change's scope.

These are all *document* issues — no `src/` behavior exists yet to contradict them, which is precisely why fixing the specs now is cheaper than fixing code that was built from them.

## What Changes

Spec deltas only. No source files, no `package.json`, no new dependencies. Each delta lives under `specs/<capability>/spec.md` using the `## MODIFIED` / `## ADDED` requirement headers, and references the canonical definition it replaces so the main specs converge on one source of truth.

### Resolved contradictions (the blockers)

1. **Canonical genesis** — one genesis definition is made authoritative; the other spec cross-references it. The reconciliation picks the richer definition from `configuration` (height=0, uuid="GENESIS", timestamp=0, validator="GENESIS", lastHash="GENESIS", hash="GENESIS", data=["GENESIS"], signature="GENESIS") and updates `blockchain-core`'s genesis scenarios to match it, including `uuid`, `validator`, and `signature` fields that were missing there.
2. **Empty-pool block vs validator** — the miner is allowed to create a reward-only block at height > 3 *only when the pool is empty*, and `blockchain-core`'s "Empty block rejected after bootstrap" scenario is scoped so a reward-only block does not count as "empty data". The two rules now agree.
3. **Stake feasibility** — the feasible region is stated explicitly (balance must be sufficient to support both the minimum stake and its fee); the scenarios now cover the impossible region as an explicit rejection.
4. **Fee model** — a single source of truth is established: the API auto-calculates `fee = amount/1000` in big.js. `electron-app` and `renderer-ui` no longer expose a user-fee field; their POST scenarios omit `fee`.
5. **Pagination** — a single path-based contract (`GET /api/blocks/:page`) is kept; the `offset/limit` wording in `electron-app` is removed and the renderer's page-button scenarios are made consistent with the clamped, newest-first semantics.

### New requirements (unaddressed gaps)

- **Wallet backup & recovery** — encrypted seed/backup restore and corrupted-or-missing-wallet failure behavior.
- **Reward crediting** — the 100-coin reward is minted to the miner's account, not deducted from it; documented in reward-validation and mining.
- **Object-hash determinism** — Crypto.hash specifies recursive key sorting for object inputs (blocks/transactions), with scenarios.
- **Signature serialization** — exact hex encoding for transaction and block signatures, with round-trip sign/verify scenarios.
- **Peer-transaction dedup** — the duplicate-sender check applies to transactions received over pubsub, not just local adds.
- **Chain-sync precedence** — precedence between root-node sync and peer-consensus `replaceChain`; `ROOT_NODE_ADDRESS` behavior in dev.
- **Error-response coverage** — non-400 failure responses (500, 401/403 no-wallet, init dependency failure).
- **Configuration for P2P** — `DISCV5_BOOTSTRAP_ENRs`, `RELAY_ENDPOINTS`, and the 30s search-interval default defined.

### Edge-case guards added across specs

Negative/zero amounts (balance, stake, transaction), out-of-range/empty pagination, null/undefined/setMap inputs, big.js division for fees, malformed P2P messages (try/catch), corrupted wallet restore, empty-chain and short-hash UI rendering, and the special-recipient validation bypass.

### Structural and prose cleanup

Cross-spec redundancy cuts (`electron-app: Express API server`, duplicate `validTransactions()` and pool-cleanup scenarios, duplicate fee/constant restatements), the prose-paragraph requirement converted to the BDD schema, removal of the `(implementation pending)` placeholder, and the "(Electron 28)" → "(Electron 42)" correction. (The "substract" spelling in `account-management` is intentionally left as a literal quote of the runtime error, not fixed.)

## Scope

**In scope:**
- `configuration` — canonical genesis, P2P environment variables, dev-mode paths
- `blockchain-core` — canonical genesis scenarios, empty-block/reward-block reconciliation, object-hash determinism, signature serialization, reward crediting
- `transaction-system` — feasible stake region, negative/zero amount rejection, reward fee/balance, stake fee validation, peer-transaction dedup
- `transaction-miner` — reward-only block on empty pool, reward crediting, pool cleanup reference
- `wallet` — backup/recovery, corrupted-wallet failure, signature serialization reference
- `crypto-utils` — object-hash determinism, null/malformed-signature handling, signature serialization
- `p2p-networking` — peer-transaction dedup, malformed-message handling, chain-sync precedence
- `api-endpoints` — single fee contract, single pagination contract, error responses, root-sync precedence, big.js amount validation
- `electron-app` — remove endpoint/pagination/fee/persistence duplication; convert prose requirement to BDD schema
- `renderer-ui` — remove fee/pagination/wallet-info duplication; empty-chain/short-hash/NaN UI handling
- `account-management` — remove `(implementation pending)`; negative-amount guards; reward-balance reference
- `build-tooling` — "(Electron 28)" → "(Electron 42)"

**Out of scope:**
- Any `src/` implementation
- `package.json` dependency changes
- New dependencies
- Changes to persisted data formats (noted as a risk for the genesis reconciliation)

## Success Criteria

1. Every cross-spec contradiction resolved: no two specs assert incompatible behavior for the same scenario.
2. Every requirement has testable WHEN/THEN scenarios — no `(implementation pending)` or similar placeholders.
3. Every requirement is guarded for negative, zero, empty, null, and out-of-range inputs.
4. Fees and balances are always specified in big.js — never JS float arithmetic.
5. Cross-spec constant duplication (reward identity, stake minimum, channel names, dev paths) references a single source.
6. `npm test` and `npm run lint` are unaffected (spec-only change).

## Risks

- **Genesis reconciliation may touch persisted data.** If a chain was built on the old `blockchain-core` genesis, switching the canonical genesis breaks backward compatibility with existing block files. The `electron-app` "Blockchain restored on startup" scenario should be updated to note the migration, or the reconciliation must pick the genesis that matches any on-disk data.
- **Reward crediting is a behavioral change.** Making the reward a mint (credited to the miner) rather than a transfer to `*authorized-reward*` changes the semantics of the special-address system; `configuration`'s `*authorized-reward*` address may be retired or repurposed.
- **Fee auto-calc removes user control.** If the product intends users to set their own fee, the single-source-of-truth decision above is wrong and should instead align the three specs around a user-set fee with validation. This proposal assumes auto-calc per `api-endpoints` (the only spec that currently computes a fee); flagging so the owner can confirm.
