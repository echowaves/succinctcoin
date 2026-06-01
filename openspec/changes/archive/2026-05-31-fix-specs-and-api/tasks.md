## 1. Update crypto-utils spec

- [x] 1.1 Update `isPublicKey()` requirement to describe hex format (64/66/130 chars)
- [x] 1.2 Update scenarios to test hex format validation (uncompressed 130, compressed 66, raw 64)
- [x] 1.3 Verify existing tests still pass with updated spec

## 2. Update build-tooling spec

- [x] 2.1 Update Electron version requirement from 28.x to 42.x
- [x] 2.2 Update dependency version scenarios to reflect actual package.json versions
- [x] 2.3 Add React 19.x version requirement
- [x] 2.4 Add libp2p 3.x version requirement
- [x] 2.5 Add dependency version format requirement (exact versions, no ^ or ~)

## 3. Clean up noble migration archive

- [x] 3.1 Remove duplicate section 4 tasks from `openspec/changes/archive/2026-05-31-migrate-secp256k1-to-noble/tasks.md`
- [x] 3.2 Verify archive still has all valid completed tasks

## 4. Verify all specs are consistent

- [x] 4.1 Run `npm test` to verify no regressions
- [x] 4.2 Run `npm start` to verify app still launches
- [x] 4.3 Review all spec files for consistency
