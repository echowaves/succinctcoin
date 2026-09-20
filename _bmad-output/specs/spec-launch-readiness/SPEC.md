---
id: SPEC-launch-readiness
companions:
  - ../../planning-artifacts/architecture/architecture-succinctcoin-2026-09-19/ARCHITECTURE-SPINE.md   # adopted: the 14-AD architecture spine (status final) that this spec operationalizes
sources:
  - openspec/specs/account-management/spec.md
  - openspec/specs/api-endpoints/spec.md
  - openspec/specs/blockchain-core/spec.md
  - openspec/specs/build-tooling/spec.md
  - openspec/specs/configuration/spec.md
  - openspec/specs/crypto-utils/spec.md
  - openspec/specs/electron-app/spec.md
  - openspec/specs/p2p-networking/spec.md
  - openspec/specs/renderer-ui/spec.md
  - openspec/specs/transaction-miner/spec.md
  - openspec/specs/transaction-system/spec.md
  - openspec/specs/wallet/spec.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Succinctcoin Launch Readiness: Deterministic State-Transition, Miner Lottery, and Consensus Invariants

## Why

A pain to solve, with a mandate to meet: succinctcoin cannot operate as a multi-node network today. Account balances are never written by any production path, so every user transaction fails "Amount exceeds balance" on every node and the chain cannot pass height 3; mining is HTTP-triggered rather than autonomous; the miner is not selected by any peer-invariant rule; pool sync performs an ungated full-replace that gives the root node standing authority; and equal-length forks resolve nondeterministically. The finalized architecture spine (2026-09-19) ratified the target state in AD-10 through AD-14 and flagged this cluster as the launch prerequisite. This spec operationalizes that ratified target state — the state-transition function, the miner lottery, and the surrounding consensus and runtime hygiene — so that two independent nodes can converge and transact.

## Capabilities

- **CAP-1** — Chain-derived account state
  - **intent:** The core applies accepted blocks to account state through exactly one state-transition function, computed purely from chain contents, so any node holding the same chain derives the same state.
  - **success:** Replaying a block sequence (reward blocks plus user transactions) into a fresh core yields balances exactly equal to starting balance plus rewards received minus amounts sent, with fees credited to the miner; validation never reads local disk.

- **CAP-2** — User transactions accepted and propagated
  - **intent:** A user can send a transaction from a funded account and have it accepted into the pool, mined, and reflected in the recipient balance on every node.
  - **success:** In a two-node test, a tx from A to B is mined; both nodes report B's balance increased by the amount; the chain grows past height 3 with user-transaction blocks.

- **CAP-3** — Deterministic miner lottery
  - **intent:** A node determines lottery wins by self-evaluating `Crypto.hash(prevBlockHash hex, publicKey hex) < threshold` with the pinned family and encoding, so eligibility is peer-invariant and equal.
  - **success:** A property test shows the winner decision is identical across independently computing nodes for the same inputs; varying the probability `p` scales the observed win rate proportionally within a statistical band.

- **CAP-4** — Autonomous mining
  - **intent:** A node mines on a fixed re-check interval without external triggers, with the HTTP mine endpoint retained as a dev-only convenience.
  - **success:** With autonomous mining on, blocks appear at the configured interval with no HTTP calls; with it off, no blocks are produced.

- **CAP-5** — Canonical block contents
  - **intent:** The system uses one canonical form for block contents — the exact hash input field set (height, uuid, timestamp, miner, lastHash, data) and a total order on `data` (timestamp ASC, uuid ASC) — so identical logical contents hash identically.
  - **success:** Two independently built blocks with identical logical contents produce the same hash regardless of `data` insertion order; the field set is versioned so any change is flagged as a hard fork.

- **CAP-6** — Pool sync without data loss or remote authority
  - **intent:** Pool sync applies only while the local chain is empty; otherwise peer pool contents merge additively by uuid, and the root `setMap` full-replace is removed.
  - **success:** Tests show an empty-chain node adopts the synced pool; a non-empty-chain node merges (uuid union, local entries survive); no full-replace code path remains.

- **CAP-7** — Deterministic fork resolution
  - **intent:** On equal-length chains the system builds on the lower block hash at the divergence point and rejects incoming equal-length chains, so all nodes converge by strictly-longer chains.
  - **success:** Presenting both forks of an equal-length pair to two nodes leaves both on the lower-hash chain; an incoming equal-length chain is rejected with a typed error.

- **CAP-8** — Root bootstrap is empty-chain-only
  - **intent:** Root state and pool sync apply only while the node's chain is empty, so bootstrap is never an override and the root holds no standing authority.
  - **success:** A node with a non-empty chain ignores root sync; the blockchain-core "Chain-sync precedence" requirement is rewritten to match the implemented behavior.

- **CAP-9** — Typed error flow
  - **intent:** The core throws typed errors and the app layer maps them to the documented HTTP envelope `{type: 'error', code, message}`, keeping all HTTP knowledge out of the core.
  - **success:** Integration tests show duplicate tx → 409, insufficient balance → 402, invalid hash or signature → 400, unexpected → 500, each in the envelope; a static check confirms no HTTP status logic in the core.

- **CAP-10** — Configuration ownership split
  - **intent:** Each config value has one owner — chain semantics in `src/main/config.js`, network in `src/config.js`, renderer values via the preload bridge — so no value is defined twice or read across a layer.
  - **success:** A static check confirms the renderer has no direct imports of `src/config`; the preload exposes `getApiPort()`; the mining re-check interval exists as an app-semantic value distinct from `VALIDATION_RATE`.

- **CAP-11** — Canonical hashing
  - **intent:** `Crypto.hash` sorts object keys recursively and pins the documented scalar-argument behavior, so hashing is canonical for all input shapes the chain uses.
  - **success:** Unit tests show nested object key order is hash-invariant; scalar behavior matches the documented contract; the crypto-utils spec is updated to match.

- **CAP-12** — Key custody
  - **intent:** A user can export an encrypted wallet backup and restore it on a new install, and the system detects a corrupted wallet file instead of silently generating a new identity.
  - **success:** Export, wipe the wallet directory, restore — the same public key results; a corrupted wallet file yields a typed error, not a fresh key; the wallet spec is updated to match.

- **CAP-13** — OpenSpec reconciliation
  - **intent:** The affected OpenSpec specs (blockchain-core, transaction-miner, api-endpoints, crypto-utils, wallet, electron-app) are rewritten to the implemented target state so the spec suite is the true contract.
  - **success:** `openspec verify` passes; every rewritten requirement traces to an architecture decision; no spec states behavior the code no longer has.

## Constraints

- C1 — Headless core (AD-1): UI → Shell → App → Core, one-way dependencies; the core has no HTTP or IPC knowledge.
- C2 — Symmetric network (AD-2): every node runs the same code, no node is privileged, the longer valid chain wins.
- C3 — No purchasable privilege (AD-3): equal mining eligibility for every node; stake is a neutral lock that gates nothing.
- C4 — Root is bootstrap-only (AD-5): root state and pool sync are gated on chain emptiness; the root holds no standing authority.
- C5 — Lottery family pinned (AD-11): fixed-odds threshold `Crypto.hash(prevBlockHash hex, publicKey hex) < threshold`, self-evaluated, both inputs hex strings, argmin-over-known-peers excluded; only the probability `p` is free (core config).
- C6 — Canonical block contents (AD-12): the hash input field set is exactly (height, uuid, timestamp, miner, lastHash, data); `data` is in total order (timestamp ASC, uuid ASC); any field-set or order change is a hard fork; the same rule applies to transaction signature inputs.
- C7 — Pool sync (AD-13): empty-gated, then additive merge by uuid, never full replace.
- C8 — Equal-length forks (AD-14): build on the lower block hash at the divergence point; reject incoming equal-length chains.
- C9 — Deterministic state-transition (AD-10): exactly one core state-transition function applies accepted blocks to account state derived purely from chain contents; validation is pure over chain contents and never reads local disk.
- C10 — Money uses `big.js` with integer units; the fee is `amount / 1000`.
- C11 — Errors follow the AD-9 envelope `{type: 'error', code, message}` with the status map: duplicate → 409, insufficient balance → 402, invalid hash or signature → 400, unexpected → 500.
- C12 — Maximum cyclomatic complexity 8.
- C13 — Tests run via `npm test` only, never `npm run test:ci`.

## Non-goals

- NG1 — Sybil resistance and multi-wallet mechanics: deferred to a separate future request; the boundary is locked by AD-3.
- NG2 — Purchasable mining privilege or staking yield: ruled out by AD-3.
- NG3 — The root as an ongoing authority or second source of truth: ruled out by AD-5.
- NG4 — Proof-of-work or difficulty-based mining: ruled out by the lottery family in AD-11.
- NG5 — Any change to the canonical hash field set without a flagged hard fork: ruled out by AD-12.

## Success signal

Two independent nodes started from the same genesis converge on the same chain and each accepts the other's user transactions past height 3; the wallet sends a user transaction that is mined and reflected in the recipient balance on both nodes; no node holds privileged authority over the other.

## Assumptions

- The lottery probability `p` value is not fixed here; it stays a free core-config parameter (the spine's deferred row), and CAP-3 success is statistical, not value-specific.
- Root bootstrap is retained for now (the user ratified keeping it); demoting it entirely is a future request, not a gap in this spec.
- Bootstrap ENR lists and relay endpoints remain empty configuration; network reachability via discv5/relay is out of this spec's test scope.
- The wallet private key remains plaintext hex on disk (ratified); CAP-12 adds backup/restore/corruption-detection without changing custody format.

## Open Questions

- What default value should the autonomous mining re-check interval take (app-semantic config, distinct from `VALIDATION_RATE`)?
- What is the initial value for the lottery probability `p` (core config)?
- Which encryption scheme should the CAP-12 encrypted backup use (e.g., password-derived key KDF), and is a human-readable export format required?
