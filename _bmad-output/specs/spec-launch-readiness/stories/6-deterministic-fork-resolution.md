---
title: 'Deterministic fork resolution'
type: 'feature'
created: '2026-09-23'
status: 'done'
baseline_revision: '92ed4efc924b3108265d8fd24d66e70339093e46'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      OpenSpec canonical spec blockchain-core ("Chain replacement (consensus)") is stale: it still requires a shorter-or-equal-length incoming chain to leave the local chain unchanged, contradicting the AD-14 lower-hash adoption now implemented.
    evidence: |-
      openspec/specs/blockchain-core/spec.md scenario "Shorter chain ignored" (WHEN shorter than or equal to THEN unchanged) is now false for the lower-hash equal-length case. Reconciled by story 10 (CAP-13 rewrites the six affected specs, blockchain-core among them).
    location: >-
      openspec/specs/blockchain-core/spec.md
    severity: medium
  - summary: >-
      ARCHITECTURE-SPINE.md AD-14 sentence "Equal-length incoming chains are still rejected (no replace)" is not reconciled with the realized adoption semantics (lower-hash equal-length fork IS replaced, and clears the pool via onSuccess).
    evidence: |-
      The spine is a planning artifact; this SPEC is the canonical contract and its CAP-7 success signal (both nodes left on the lower-hash chain) resolves the reading — a node on the higher fork must adopt the lower one, so "reject" can only mean reject-the-higher. Reconciling the spine's sentence is documentation hygiene, not a code defect.
    location: >-
      _bmad-output/planning-artifacts/architecture/architecture-succinctcoin-2026-09-19/ARCHITECTURE-SPINE.md (AD-14)
    severity: low
  - summary: >-
      The equal-length adoption/rejection path is not tested at the pubsub message boundary (handleBlockchainMessage): pool clearing on adoption and the absence of pool clearing on higher-fork rejection are only guaranteed indirectly by onSuccess not firing.
    evidence: |-
      pubsub.test.js:86-97 feeds only the identical chain (a no-op under the new rule), so the branch would pass even if a higher-hash fork were adopted. The core rule is pinned at the unit boundary (index.test.js equal-length describe); the consumer merely routes the deserialized chain into replaceChain. The two-node convergence demo (story 10, JEST_WORKER_ID .test/ convention) is the natural home for end-to-end equal-length convergence.
    location: >-
      src/main/app/pubsub.test.js
    severity: medium
---

<intent-contract>

## Intent

**Problem:** `Blockchain.replaceChain` rejects every incoming chain that is not strictly longer (`chain.length <= this.chain.length`), so two nodes holding different valid forks of equal length never converge — each rejects the other's fork and keeps extending its own, and the build-on tip (the lottery's `prevHash` input per AD-11) is whichever fork arrived first, feeding divergent miner selection.

**Approach:** Make the equal-length chain choice deterministic. When a valid incoming chain is equal length to the local chain, adopt the one with the lower block hash at the first divergence point (identical on every node); reject the higher-hash one. The strictly-longer and validity rules are unchanged (AD-2).

## Boundaries & Constraints

**Always:**
- A valid strictly-longer incoming chain replaces the local chain (AD-2, unchanged).
- An invalid incoming chain is always rejected, regardless of length (unchanged).
- On equal length, the chain with the lower block hash at the first divergence point is canonical and is adopted; the higher-hash fork is rejected (no replace, no pool clear).
- The divergence comparison uses block hashes only (AD-12 canonical content), in lexicographic order — hashes are fixed-length lowercase hex, so string order equals numeric order. It never uses timestamps, uuids, or receipt order.
- Identical equal-length chains (no divergence) are a no-op: no replace, no `onSuccess`/pool clear.
- `onSuccess` fires only on an actual chain change (strictly-longer replace or lower-hash adopt), never on a rejection or no-op.

**Never:**
- No changes to `Crypto.hash`, `isValidChain`, the state transition, the lottery, or the miner's build-on logic (the miner builds on `chain[len-1]`; a deterministic tip is sufficient — no miner change).
- No new dependencies; no HTTP/IPC in the core (AD-1).
- No typed-error or HTTP-status logic introduced here (that is CAP-9 / AD-9, a later story); rejections keep the existing log-and-return style.
- No change to the root-sync gate or pool merge (prior story), or to block contents / canonical order.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| EQUAL_LOWER_ADOPT | local on fork A (higher hash at divergence); incoming fork B (lower hash), equal length, both valid | local chain becomes B; onSuccess fires | No error |
| EQUAL_HIGHER_REJECT | local on fork B (lower); incoming fork A (higher), equal length, both valid | local chain stays B; onSuccess NOT fired | rejection logged, no replace |
| EQUAL_IDENTICAL_NOOP | incoming chain identical to local (equal length, all hashes equal) | local chain unchanged; onSuccess NOT fired | No error |
| LONGER_REPLACES | incoming strictly longer + valid | local chain replaced | No error |
| SHORTER_REJECTED | incoming strictly shorter | local chain unchanged | 'must be longer' logged |
| INVALID_REJECTED | incoming invalid (corrupt hash / bad genesis), any length | local chain unchanged | 'must be valid' logged |
| CONVERGE_BOTH_FORKS | two equal-length valid forks; one node holds each; each receives the other's fork | both nodes end on the lower-hash fork | No error |

</intent-contract>

## Code Map

- `src/main/blockchain/index.js` -- `Blockchain.replaceChain` (line ~29): currently rejects `chain.length <= this.chain.length` (logs 'The incoming chain must be longer'), then checks `isValidChain`. Add the equal-length divergence branch + a static `compareForks` helper. `isValidChain` (line ~50) is unchanged.
- `src/main/blockchain/index.test.js` -- existing `replaceChain()` describe (line ~111): 'not longer' (length 1 vs 4, invalid genesis), 'longer/invalid', 'longer/valid'. No equal-length test exists yet; add the equal-length cases here.
- `src/main/app/pubsub.js` -- `handleBlockchainMessage` (line ~187) is the only equal-length caller (peer chains, rehydrated into `Block` instances via `deserializeChain`). Unchanged; its `onSuccess` clears pool txs for the adopted chain.
- `src/main/app/root-sync.js` -- calls `replaceChain(rootChain)` only while `chain.length === 1` (genesis-only); the root chain is always strictly longer, so the equal-length branch is unreachable here. Unchanged.
- `src/main/util/crypto.js` -- `Crypto.hash` returns `.digest('hex')` (fixed-length lowercase hex) → lexicographic string compare equals numeric compare. Read-only evidence for the comparison rule.

## Tasks & Acceptance

**Execution:**
- `src/main/blockchain/index.js` -- add a static `Blockchain.compareForks(a, b)` returning -1 / 0 / 1 for the first divergence point by block hash (a lower = -1, identical = 0, a higher = 1); in `replaceChain`, after the existing shorter-reject and validity checks, branch on `chain.length === this.chain.length`: adopt the incoming chain when `compareForks(chain, this.chain) < 0` (lower hash), reject (log, no replace) when `> 0`, no-op when `=== 0` -- the AD-14 deterministic equal-length rule.
- `src/main/blockchain/index.test.js` -- matrix coverage: build two equal-length valid forks (shared prefix, diverge by different miners) and assert lower-adopt, higher-reject, identical-noop; keep the existing shorter/invalid/longer cases passing; add the CONVERGE_BOTH_FORKS two-node scenario.

**Acceptance Criteria:**
- Given two valid equal-length forks (A higher-hash, B lower-hash at the divergence point), when a node holding A receives B, then it adopts B; when a node holding B receives A, then it keeps B — both converge on the lower-hash fork.
- Given an equal-length incoming chain identical to the local chain, when `replaceChain` runs, then the chain is unchanged and the `onSuccess` callback is not called.
- Given a valid strictly-longer, strictly-shorter, or invalid incoming chain, when `replaceChain` runs, then the existing AD-2 behavior is unchanged.

## Spec Change Log

## Review Triage Log

## Design Notes

The comparison is a lexicographic compare of block hashes at the first index where the two equal-length chains differ. Block hashes are AD-12 canonical content, so two blocks with equal hashes are the same block; the first differing hash IS the divergence point. Because `Crypto.hash` emits fixed-length lowercase hex, `a.hash < b.hash` is a total order identical to numeric order, computable identically on every node (no peer set, no receipt order). The miner needs no change: it builds on `chain[len-1]`, so a deterministic tip yields a deterministic next-lottery `prevHash`.

```js
static compareForks(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].hash !== b[i].hash) return a[i].hash < b[i].hash ? -1 : 1
  }
  return 0
}
```

## Verification

**Commands:**
- `npx jest src/main/blockchain/index.test.js --ci` -- expected: all replaceChain cases (existing + new equal-length) pass.
- `npm test` -- expected: full suite green.
- `npm run lint` -- expected: no new findings in touched files.

**Manual checks:**
- Inspect `replaceChain`: strictly-longer and validity behavior unchanged; the equal-length branch is the only new path.

## Review Triage Log

### 2026-09-23 — Review pass
- verdicts: 19 findings — high 0, medium 3, low 10, false 6, maybe-false 0
- findings:
  - `[medium]` `[defer]` (blind #1) `openspec/specs/blockchain-core/spec.md` "Shorter chain ignored" (shorter-than-OR-EQUAL stays unchanged) contradicts the AD-14 lower-hash adoption — verified true against the spec text. Pre-existing document, not caused by this diff (the doc predates the story); reconciled by story 10 (CAP-13 rewrites the six affected specs, blockchain-core among them). Deferred.
  - `[low]` `[defer]` (blind #2) `ARCHITECTURE-SPINE.md` AD-14 "Equal-length incoming chains are still rejected (no replace)" not reconciled with realized adoption — verified true as text; the spine is a planning artifact and this SPEC (canonical contract, CAP-7 success "both nodes left on the lower-hash chain") resolves the reading. Documentation-hygiene; no code harm. Deferred.
  - `[medium]` `[patch]` (blind #3) no test pins rejection of an invalid equal-length incoming chain — the matrix row INVALID_REJECTED says "any length" but the existing invalid case exercises only the strictly-longer path; the gate order (validity dominates the tie-break, intent reading C) was unverified. Fixed: added `and the incoming chain is invalid` case to the equal-length describe (corrupt tip hash, local on higher fork → not replaced, no onSuccess, rejection logged). Re-verification green (30/30 focused, 177/177 full, lint 60).
  - `[low]` `[reject]` (blind #4) `compareForks` has no equal-length precondition — documented in the static's comment ("compare two equal-length chains") and enforced at the only call site (the `chain.length === this.chain.length` guard); unequal input would surface loudly in the test that exercises it. A guard adds a branch protecting an unreachable state — not worth the complexity.
  - `[low]` `[patch]` (blind #5 + verification-gap other, grouped) stale "not longer" label — `describe('when the new chain is not longer')` now covers only strictly-shorter chains; equal-length is a first-class outcome. Fixed: renamed to `when the new chain is shorter`.
  - `[low]` `[reject]` (blind #6) `beforeEach` never asserts the forks diverge by hash — `expect(lowerFork).not.toBe(higherFork)` is reference inequality; if the forks were identical, the `compareForks` unit tests (0-case) plus the identical-chain no-op test would already catch it, and the lower/higher split is computed from `compareForks` itself, which is unit-tested. Adding a hash-inequality assertion is not worth the cost.
  - `[low]` `[reject]` (blind #7) `nodeAChain`/`nodeBChain` declared after the `beforeEach` that assigns them — works at runtime (callback runs later); moving two `let` declarations is a cosmetic rearrangement, not worth the cost.
  - `[low]` `[reject]` (blind #8) higher-fork rejection logged at error level with "not canonical" wording — the intent's Never bullet explicitly pins "rejections keep the existing log-and-return style"; all three pre-existing rejections use `console.error`. Spec-chosen; changing it would deviate from the pinned style. (The pre-existing `replaceChain` log is AD-9 territory, story 7.)
  - `[medium]` `[defer]` (blind #9 + verification-gap MAIN + intent S1/S2, grouped) no integration coverage of the equal-length branch at its only live caller `handleBlockchainMessage` (pool-clear-on-adoption, no-clear-on-rejection) — verified: `pubsub.test.js:86-97` feeds only the identical chain (a no-op under the new rule), so the branch is unpinned at the message boundary. The core rule is pinned at the unit boundary; the consumer is unchanged and merely routes; the VG layer's own filed disposition is `defer`. The two-node convergence demo (story 10) is the natural home. Deferred.
  - `[medium]` `[defer]` (edge #1, grouped) `replaceChain` has no type guard on its `chain` argument (null/undefined/non-array → TypeError) — pre-existing: the old `chain.length <= this.chain.length` line had the identical exposure; both production callers (pubsub deserialization, root-sync) pass arrays. Adding a guard protects a state the callers do not produce. Deferred.
  - `[medium]` `[defer]` (edge #2, grouped with blind #4) `compareForks` on unequal-length chains — the precondition is documented and the only call site is length-guarded; same rationale as blind #4. Deferred as a hardening note.
  - `[false]` `[reject]` (edge #3) non-hex/malformed block hash misorders forks — the validity gate runs before the tie-break and `Block.validate` recomputes `Crypto.hash` (sha512, fixed 128-char lowercase hex), so only canonical hashes ever reach `compareForks`; a malformed hash fails `isValidChain` first. The bad outcome does not occur at the cited location.
  - `[false]` `[reject]` (edge #4) concurrent `replaceChain` reassigns `this.chain` across the `isValidChain` await — the equal-length rule is confluent (keep the lower): the higher fork is never assigned (it rejects), so a stale comparison cannot adopt the wrong fork; any strictly-longer adoption is self-corrected when the lower fork re-arrives and wins the tie-break. The pre-existing longer-chain race is unchanged by this diff and is not a consensus break under AD-2/AD-14.
  - `[false]` `[reject]` (verification-gap other) `pubsub.test.js:86` test name "…when the incoming chain is not longer" misleading — fixed in this pass by the patch entry (renamed to "identical"); no separate action.
  - `[false]` `[reject]` (intent S3) root-sync path unexercised for the equal-length branch — true, but unreachable by construction (the gate calls `replaceChain` only while `chain.length === 1`, and a length-1 root chain fails the longer check); the intent's "no change to the root-sync gate" is satisfied. No gap.
  - `[false]` `[reject]` (intent S4) the collateral `addBlock` test fix (positional → membership) is unrelated to the equal-length intent — true as a description, but it is a required repair: Story 5's canonical sort made the reward's position uuid-nondeterministic, breaking that pre-existing positional assertion (~60% flake rate measured). Fixing a broken test in a touched file is part of keeping the suite green, not scope creep; the loosened order is independently pinned by `block.test.js` (verified by the VG layer).
  - `[false]` `[reject]` (intent S1) convergence asserted over two core instances, not the network layer — the intent's Always bullets specify the `replaceChain` rule; the miner builds on `chain[len-1]` so a deterministic core tip IS the convergence mechanism; network-level coverage is deferred (blind #9 entry) for story 10.
  - `[false]` `[reject]` (intent S2) `onSuccess` contract verified only as call counts — the intent pins "onSuccess fires only on an actual chain change"; call-count assertions verify exactly that; the caller's pool-clear wiring is pre-existing, unchanged, and exercised by the existing `handleBlockchainMessage` longer-chain test.
  - `[low]` `[reject]` (blind floor note) finding floor was 3; 9 returned — no additional low findings beyond the above; all remaining observations map to entries already logged.

## Auto Run Result

**Summary:** Deterministic equal-length fork resolution (AD-14). `Blockchain.replaceChain` now rejects only strictly-shorter incoming chains; a valid equal-length chain is resolved by `Blockchain.compareForks` (first-divergence block-hash compare, lexicographic on fixed-length lowercase hex) — the lower-hash fork is adopted (onSuccess fires), the higher-hash fork is rejected (log, no replace), identical chains are a silent no-op. Strictly-longer and validity behavior is unchanged (AD-2); the miner is unchanged (it builds on the tip, which is now deterministic). A pre-existing flaky `addBlock` test (positional assertion broken by Story 5's canonical sort) was repaired in the same file.

**Files changed:**
- `src/main/blockchain/index.js` — strict `<` shorter-reject; equal-length branch (lower adopt / higher reject / identical no-op) after the validity gate; static `compareForks`.
- `src/main/blockchain/index.test.js` — equal-length matrix coverage (lower-adopt, higher-reject, identical-noop, invalid-reject, two-node convergence), `compareForks` unit tests, stale describe rename, `addBlock` test flake repair (membership assertions + `config` import).
- `src/main/app/pubsub.test.js` — stale test name renamed ("not longer" → "identical").

**Review findings breakdown:** 19 findings — 3 findings in 2 patched entries (medium: invalid equal-length chain untested → test added; low: stale "not longer" label in `index.test.js` → renamed, with the grouped `pubsub.test.js` rename), 6 findings in 3 deferred entries (medium: OpenSpec blockchain-core stale → story 10; low: spine AD-14 sentence unreconciled; medium: pubsub-boundary equal-length coverage → story 10 convergence demo; plus 2 medium hardening notes grouped under the pre-existing no-argument-guard entry), 10 rejected (6 `false` — spec-pinned log style, validity-gate-disproven hash concern, confluent-rule race analysis, unreachable root-sync path, collateral-flake-repair justification, surface-mapping notes; 4 `low` — precondition guard, hash-divergence assertion, declaration order, floor note).

**Follow-up review recommendation:** `false` — first pass, no `high` patched, and only one `medium` entry was patched (the invalid-equal-length test).

**Verification performed:**
- `npx jest src/main/blockchain/index.test.js --ci` — 23/23 (pre-patch); 30/30 with `pubsub.test.js` post-patch.
- `npm test` — 174/174 pre-patch (two consecutive runs); 177/177 post-patch.
- `npm run lint` — 60 problems (36 errors, 24 warnings): the pre-existing baseline; no new findings in touched files.
- Flaky-test audit: `addBlock` test failed 6/10 pre-repair (AD-12 uuid tie-break); 10/10 pass post-repair.
- `replaceChain` inspected: strictly-longer and validity behavior unchanged; the equal-length branch is the only new path.

**Residual risks:**
- OpenSpec `blockchain-core` spec still states the old shorter-or-equal rejection — the spec suite contradicts shipped behavior until story 10 reconciles it (deferred).
- Equal-length convergence is pinned at the `replaceChain` unit boundary, not yet at the gossip message boundary — the two-node convergence demo in story 10 is the planned end-to-end proof (deferred).
- `replaceChain`/`compareForks` carry no runtime argument-type guards — pre-existing exposure, callers pass well-formed arrays (deferred hardening note).
