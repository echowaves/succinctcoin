---
title: 'Canonical hashing'
type: 'refactor'
created: '2026-09-20'
status: 'done'
baseline_revision: '291d80f8ca71cb368e6d77c5f98c3024253d1140'
review_loop_iteration: 0
followup_review_recommended: false
context: []
# (followup flag computed at review close: 1 patched medium entry, 0 high -> false)
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** `Crypto.hash` canonicalizes each input with a plain `JSON.stringify`, so two objects with identical logical content but different key insertion orders hash differently. That breaks the canonical-content guarantee the architecture spine (AD-12) and SPEC-launch-readiness CAP-11 require: blocks and signatures must hash identically on every peer regardless of construction order. The existing scalar-argument contract (per-input strings, sorted, space-joined, sha512 hex) is already pinned by tests and must not change.

**Approach:** Add recursive object-key sorting inside the per-input canonical encoding (keys sorted at every nesting depth, arrays keep element order, full `JSON.stringify` semantics preserved) and keep the existing per-input sort + space-join + sha512. Add unit tests pinning both the new invariance and the existing scalar contract.

## Boundaries & Constraints

**Always:**
- Preserve the scalar contract exactly: each input is independently canonicalized to a string, the per-input strings are lexicographically sorted, joined with a single space, and digested as sha512 hex. `Crypto.hash('foo')` must keep its existing value, and `hash('one','two','three') === hash('three','one','two')` must keep holding.
- Arrays preserve element order at every depth (block `data` ordering is semantically significant, not decoration).
- Canonicalization must inherit `JSON.stringify` serializer semantics (e.g. `toJSON` for Dates, dropping `undefined` properties) — values that are already canonical must serialize byte-identically to before.
- Maximum cyclomatic complexity 8; no new dependencies; money/crypto conventions untouched.

**Never:**
- No changes to hash call sites (`block.js`, `wallet.js`, `transaction.js`, `account.js`, renderer) — this story touches `Crypto.hash` internals and its test file only.
- No changes to `hexToBytes`, `bytesToHex`, `verifySignature`, or `isPublicKey`.
- No reordering of per-input sort, join separator change, or digest-encoding change.
- No rewriting of the OpenSpec `crypto-utils` spec document (that is story 10's scope).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| NESTED_KEY_ORDER | `hash({a:1, b:{c:2, d:3}})` vs `hash({b:{d:3, c:2}, a:1})` | hashes equal | No error expected |
| ARRAY_OF_OBJECTS | `hash([{z:1, a:2}])` vs `hash([{a:2, z:1}])` | hashes equal | No error expected |
| ARRAY_ELEMENT_ORDER | `hash([1, 2])` vs `hash([2, 1])` | hashes differ | No error expected |
| SCALAR_ORDER_PINNED | `hash('one','two','three')` vs `hash('three','one','two')` | hashes equal (existing behavior) | No error expected |
| PINNED_VALUE | `hash('foo')` | equals `7822850fecc31ad84d42bc4dfad785dc1ba286202e19271979763f9c39aba48156a3374d8f483b0a7f0dd5d1b044d4452fba5d8495501f7bcf526db1ad1691f3` (unchanged) | No error expected |
| DATE_INPUT | `hash({d: new Date(x)})` vs `hash({d: new Date(x).toISOString()})` | hashes equal (`toJSON` respected) | No error expected |
| UNDEFINED_PROP | `hash({a:1, b:undefined})` vs `hash({a:1})` | hashes equal (dropped, as before) | No error expected |

</intent-contract>

## Code Map

- `src/main/util/crypto.js` -- TARGET. `Crypto.hash` (lines 6–11) is currently `sha512(inputs.map(i => JSON.stringify(i)).sort().join(' '))`. Only the per-input encoding changes; the sort/join/digest pipeline is untouched. `hexToBytes`/`bytesToHex`/`verifySignature`/`isPublicKey` are read-only.
- `src/main/util/crypto.test.js` -- existing suite: pinned `hash('foo')` value (line ~8), scalar order invariance (line ~13), object-mutation uniqueness (line ~19). New tests append to the `Crypto.hash()` describe block. Uses real node `crypto` (only `@noble/secp256k1` is jest-mocked, via `__mocks__/@noble/secp256k1.js`).
- Read-only call sites (no changes expected): `src/main/blockchain/block.js` mineBlock (~:43) and validate (~:111) pass `(height, uuid, timestamp, miner, lastHash, data[])`; `src/main/blockchain/wallet.js` sign (~:54) and `transactionSignature` pass scalar arrays; `src/main/blockchain/account.js:23` hashes a public-key string; `src/renderer/components/Transaction.js:17-18` uses the hash for display only. Block/wallet/account tests recompute expected hashes via `Crypto.hash`, so they stay consistent under the new canonicalization.

## Tasks & Acceptance

**Execution:**
- `src/main/util/crypto.js` -- add a key-sort canonicalization as a `JSON.stringify` replacer `(key, value)`: return a new plain object with sorted own-key insertion order, pass arrays, scalars, and null through, and let stringify's own recursion handle depth -- makes object key order hash-irrelevant at all depths while inheriting `JSON.stringify` semantics (toJSON, undefined-dropping) instead of re-implementing them.
- `src/main/util/crypto.test.js` -- add tests for the I/O matrix rows (nested key order, array-of-objects, array element order sensitivity, Date/`toJSON`, undefined property) and keep the existing pinned `hash('foo')` and scalar-order tests unmodified as regression guards.

**Acceptance Criteria:**
- Given logically-equal inputs differing only in object key insertion order (including nested objects and arrays of objects), when `Crypto.hash` is called on each, then the hashes are equal.
- Given two inputs differing only in array element order, when hashed, then the hashes differ.
- Given the pre-change scalar inputs, when hashed after the change, then outputs are byte-identical to the pre-change values (existing pinned and order-invariance tests pass unmodified).
- Given the full suite, when `npm test` runs, then it passes (block/wallet/account tests recompute hashes dynamically and remain green).

## Spec Change Log

## Review Triage Log

### 2026-09-20 — Review pass
- verdicts: 17 findings — high 0, medium 3, low 8, false 6, maybe-false 0
- findings:
  - `[medium]` `[patch]` (BH-1) No absolute golden pin for any object-input hash — invariance-only tests would stay green if the canonical form regressed while preserving order-invariance — added golden pins: `hash({a:1, b:{c:2,d:3}})` and block-shaped multi-input `hash(0,'u',0,'m','l',[{a:1}])`, computed from the shipped implementation and verified byte-identical to the pre-change impl for already-canonical objects
  - `[low]` `[patch]` (BH-3) No cross-version compatibility note in the story — appended cross-version note to Design Notes (object hashes change for non-sorted key order vs pre-upgrade peers; scalars/already-canonical byte-identical; mixed-version needs coordinated upgrade)
  - `[low]` `[patch]` (BH-4) Design Notes code block showed the broken single-arg walker sketch — replaced with the shipped 2-arg replacer plus an explanation of why the original sketch fails the replacer signature
  - `[low]` `[patch]` (BH-5) Execution bullet misdescribed the helper ("map over arrays") — reworded to the replacer semantics (arrays/scalars pass through; stringify recursion handles depth)
  - `[low]` `[patch]` (BH-6) No forward pointer to the crypto-utils spec rewrite (CAP-11's other half) — added pointer to story 10 in Design Notes
  - `[low]` `[patch]` (BH-7) `sortKeysDeep` JSDoc under-specified — documented the `key` param as unused-by-design and the return as a NEW object with sorted insertion order
  - `[low]` `[patch]` (BH-8) No combined array test (key-order invariance x element-order sensitivity in arrays of objects) — added composition test (equal under per-object key reorder, different under element reorder)
  - `[low]` `[patch]` (BH-10) Verification did not note that consumer-suite green is self-consistency-only — added note pointing at the golden pins as the absolute-form guard
  - `[low]` `[patch]` (IA-b) Intent auditor: story's Design Notes sketch internally inconsistent with its own prose — same root as BH-4, same amendment (carried into the Design Notes patch above)
  - `[medium]` `[patch]` (VG-1) Verification gap: no test pins the object-input canonical form; layer demonstrated two regressions (leaf value coercion, join separator) that pass all 8 pre-patch tests yet change cross-peer digests — closed by the same golden pins (grouped with BH-1); layer's Other-finding (cross-version divergence) logged separately as accepted-by-intent
  - `[medium]` `[patch]` (IA-e) Byte-identity "Always" constraint asserted by no test for object inputs — closed by golden pin G1 (verified byte-identical old vs new for already-canonical objects)
  - `[false]` `[reject]` (BH-2) "No top-level key order test" — disproved: the nested-key-order test's operands reverse the top-level keys (`{a:1, b:{…}}` vs `{b:{…}, a:1}`), and golden pin G1 hashes a top-level `{a:1, b:{…}}` object; the headline case is exercised
  - `[false]` `[reject]` (BH-9) "frontmatter self-consistency risk" — the flag is computed at review close per the workflow Finalize step (1 patched medium entry, 0 high → false); the in-review default is expected, not inconsistent
  - `[false]` `[reject]` (VG-2) Cross-version hash divergence flagged as operational — not a gap in this change: the intent's "Always" byte-identity clause applies to already-canonical values (verified true), the value change for non-canonical order is the story's accepted purpose, and rollout is launch-readiness scope (spine Deferred / story 10); note captured in Design Notes regardless
  - `[false]` `[reject]` (IA-a) Motivation surface (cross-peer block identity) vs exercised surface (unit) — the intent selects the unit surface ("Add unit tests pinning…", "Never: no changes to hash call sites"); the cross-peer guarantee is motivation, established transitively, and multi-object block hashing is exercised by the existing block mineBlock/validate suites
  - `[false]` `[reject]` (IA-c) "Third file beyond the two named" — the story artifact is this dispatch's own record under folder+id dispatch; the boundary clause scopes the implementation surface (src files), not the workflow artifact
  - `[false]` `[reject]` (IA-d) "Add tests pinning the scalar contract" vs relying on existing pins — the intent itself states the scalar contract "is already pinned by tests and must not change"; the unmodified pre-existing pinned-value and order-invariance tests are the selected reading

## Auto Run Result

Status: done (2026-09-20)

**Summary:** `Crypto.hash` now canonicalizes each input with a `JSON.stringify` replacer that re-sorts plain-object keys at every depth, making object key insertion order hash-irrelevant while inheriting `JSON.stringify` semantics (toJSON, undefined-dropping) and preserving the pinned scalar contract exactly (per-input sort, space-join, sha512 hex untouched).

**Files changed:**
- `src/main/util/crypto.js` — added `sortKeysDeep(key, value)` replacer; `Crypto.hash` uses `JSON.stringify(input, sortKeysDeep)`; no other function or call site touched
- `src/main/util/crypto.test.js` — +8 tests: 5 matrix rows (nested key order, array-of-objects, element-order sensitivity, Date/toJSON, undefined-dropping) + 3 review patches (object golden pin, block-shaped multi-input golden pin, array composition)
- `_bmad-output/specs/spec-launch-readiness/stories/1-canonical-hashing.md` — story record (this file)

**Review findings breakdown:** 17 findings across 4 layers (blind-hunter 10, edge-case-hunter 0, verification-gap 2, intent-alignment 5). Patched: 11 (1 medium group — golden pins; 7 low artifact-doc/JSDoc/composition). Deferred: 0. Rejected: 6 false findings with refutations in the triage log above.

**Follow-up review recommendation:** false — one patched medium entry, zero high (first-pass rule: true only if a high or ≥2 medium entries patched).

**Verification performed:** `npx jest src/main/util/crypto.test.js` → 15/15 pass (incl. unmodified pinned scalar value and scalar-order tests). `npm test` → 7 suites / 126 tests pass, `crypto.js` 100% statement/branch/line coverage. `npm run lint` on changed files → 4 findings, all pre-existing at baseline (1 import/order warning + 3 indent errors in `hexToBytes`/`bytesToHex`, byte-identical to HEAD). Golden pins computed from the shipped impl and verified: already-canonical object byte-identical old vs new; non-canonical order differs; `hash('foo')` unchanged.

**Residual risks:** object-input hash values change versus pre-upgrade peers for non-lexicographic key order (intended; mixed-version consensus needs coordinated upgrade — launch-readiness rollout context). Pre-existing lint errors in `crypto.js` remain (out of scope: the two affected functions are frozen by the spec's Never clause).

## Design Notes

Use the `JSON.stringify(value, replacer)` form rather than a hand-rolled value walk: the replacer receives post-`toJSON` values, so Date and custom-serializer behavior is inherited unchanged, and returning a reconstructed object with sorted insertion order is all the canonicalization needed. A manual walk would silently change Date/undefined semantics. (The original planning sketch showed a single-arg `sortKeysDeep(value)` walker; that form is wrong in the replacer position — `JSON.stringify` invokes the replacer as `replacer(key, value)`, so a single-param version receives the key and returns `""` for object roots. The shipped 2-arg replacer below is the corrected form.)

```js
function sortKeysDeep(key, value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value).sort().reduce((acc, k) => {
      acc[k] = value[k]
      return acc
    }, {})
  }
  return value
}
// Crypto.hash: sha512 of inputs.map(v => JSON.stringify(v, sortKeysDeep)).sort().join(' ')
```

Cross-version note: object-input hash values change versus pre-upgrade peers for any input whose keys were not already in lexicographic order; already-canonical objects and all scalar inputs are byte-identical (verified). Mixed-version consensus requires a coordinated upgrade — this is the launch-readiness prerequisite context, not a gap in this story. The OpenSpec `crypto-utils` document rewrite that closes the other half of CAP-11's success criterion is story 10.

## Verification

**Commands:**
- `npx jest src/main/util/crypto.test.js` -- expected: all pass, including the unmodified scalar pinned-value test and the new object-input golden pins
- `npm test` -- expected: full suite green (never `npm run test:ci`)
- `npm run lint` -- expected: no new findings

**Note:** the block/wallet/account suites recompute expected hashes through `Crypto.hash` themselves, so their green status is a self-consistency check under any canonicalization; the absolute canonical form is guarded by the golden-value pins in `crypto.test.js` (object input and block-shaped multi-input call).
