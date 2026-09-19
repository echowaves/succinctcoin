# Tasks: Reconcile Spec Conflicts and Close Behavioral Gaps

All work is spec-documentation only. No `src/` edits, no `package.json` changes, no new dependencies (per openspec/config.yaml). Order is dependency-first: canonical definitions first, then the specs that depend on them.

## Task 1: Establish the canonical genesis and P2P configuration
Dependencies: none.
- [x] Update `specs/configuration/spec.md` — keep the richer genesis definition as authoritative and require all other specs to cross-reference it here.
- [x] Update `specs/configuration/spec.md` — add P2P discovery config: `DISCV5_BOOTSTRAP_ENRs` (empty => relay-only), `RELAY_ENDPOINTS` (empty => no relay), and the 30s search-interval default.
- [x] Verify the genesis definition matches any on-disk block files (or note the migration risk in proposal.md). (Note: proposal already flags the on-disk-legacy risk; project never shipped. Verified 2026-09-19: `~/.succinctcoin/blocks/` is empty and no `.test/blocks/` exists — no on-disk blocks can conflict with the canonical genesis.)

## Task 2: Reconcile blockchain-core genesis and empty-block rules
Dependencies: Task 1.
- [x] Update `specs/blockchain-core/spec.md` — update genesis scenarios to the canonical values (uuid, validator, lastHash, hash, data, signature) and add the missing fields.
- [x] Update `specs/blockchain-core/spec.md` — add the reward-only-block-on-empty-pool exception to "Empty block rejected after bootstrap" so it agrees with transaction-miner.
- [x] Update `specs/blockchain-core/spec.md` — add object-hash determinism requirement (recursive key sort for object inputs) and null-hash handling.

## Task 3: Reconcile reward crediting and stake feasibility
Dependencies: Task 2.
- [x] Update `specs/transaction-system/spec.md` — define reward crediting as a mint to the miner's account (not a deduction).
- [x] Update `specs/transaction-system/spec.md` — state the feasible stake region (balance must cover stake + fee) and add negative/zero amount rejection.
- [x] Update `specs/transaction-miner/spec.md` — allow reward-only block on empty pool and add reward-credited-to-miner scenario.

## Task 4: Unify fee and pagination contracts
Dependencies: Task 3.
- [x] Update `specs/api-endpoints/spec.md` — single fee source (auto amount/1000 in big.js); remove client-fee wording; add amount validation and non-400 error responses.
- [x] Update `specs/electron-app/spec.md` — remove the duplicated Express API endpoint requirement (reference api-endpoints); remove offset/limit pagination wording.
- [x] Update `specs/renderer-ui/spec.md` — remove fee field and offset/limit pagination wording; align with path-based clamped pagination.

## Task 5: Close P2P, wallet, and crypto gaps
Dependencies: Task 2.
- [x] Update `specs/p2p-networking/spec.md` — add peer-transaction dedup, malformed-message handling, and chain-sync precedence.
- [x] Update `specs/wallet/spec.md` — add wallet backup/recovery and corrupted-wallet failure behavior; reference signature serialization.
- [x] Update `specs/crypto-utils/spec.md` — add object-hash determinism, null/malformed-signature handling; reference signature serialization.

## Task 6: Structural and prose cleanup
Dependencies: Tasks 4–5 (after conflicts resolved).
- [x] Update `specs/electron-app/spec.md` — convert the prose-paragraph "Electron window management" requirement into the BDD scenario schema.
- [x] Remove remaining cross-spec constant duplication references (reward identity, stake minimum, channel names, dev-mode paths) in favor of the canonical source.
- [x] Verify the "substract" spelling in the overdraw/over-stake throw statements in `src/main/blockchain/account.js` (lines 32, 44). The source still uses the typo "substract" (also in `account.test.js`); the account-management delta does NOT alter the balance/stake subtraction scenarios, so the quoted literal in the canonical spec should match the source. No spec change was made for the typo.
- [x] Fix "(Electron 28)" → "(Electron 42)" in `specs/build-tooling/spec.md`.

## Task 7: Verify
- [x] Confirm no requirement contains `(implementation pending)` or similar placeholders. (Verified 2026-09-19: `grep -rn "implementation pending\|TODO\|FIXME" openspec/specs/` returns nothing.)
- [x] Confirm no two specs assert incompatible behavior for the same scenario. (Verified 2026-09-19: single canonical genesis in configuration + blockchain-core cross-reference; reward-only-on-empty-pool consistent across blockchain-core / transaction-system / transaction-miner; single fee and pagination contracts.)
- [x] Confirm every requirement has testable WHEN/THEN scenarios guarded for negative/zero/empty/null/out-of-range inputs. (Verified 2026-09-19: guards present in all 12 capability specs; `openspec validate` passes — every requirement carries a scenario.)
- [x] Run `npm test` and `npm run lint` to confirm the spec-only change has no effect on the suite. (Verified 2026-09-19: 118/118 tests pass; all lint findings are pre-existing source-file issues, none in `openspec/`.)
