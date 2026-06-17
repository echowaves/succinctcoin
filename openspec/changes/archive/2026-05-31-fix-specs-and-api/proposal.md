## Why

The noble migration (secp256k1 → @noble/secp256k1) was completed but left several artifacts and code paths in an inconsistent state:
- The `crypto-utils` spec still describes PEM-format public keys, but the code now uses hex format
- The `build-tooling` spec has stale version requirements (Electron 28.x vs actual 42.3.0)
- The accounts API endpoint returns HTML error pages instead of JSON
- The noble migration tasks.md has 4 duplicate unchecked tasks in section 4

These inconsistencies make the spec docs unreliable and the API endpoint broken.

## What Changes

- Update `crypto-utils` spec to reflect hex-based public key format (64/66/130 hex chars)
- Update `build-tooling` spec with current dependency versions
- Fix the accounts API endpoint to return proper JSON responses
- Clean up `tasks.md` by removing duplicate section 4 tasks from the noble migration archive

## Capabilities

### Modified Capabilities
- `crypto-utils`: Public key validation format changed from PEM to hex
- `build-tooling`: Version requirements updated to match actual dependencies
- `api-endpoints`: Accounts endpoint behavior corrected

## Impact

- `openspec/specs/crypto-utils/spec.md` — updated requirements
- `openspec/specs/build-tooling/spec.md` — updated version requirements
- `openspec/specs/api-endpoints/spec.md` — updated accounts endpoint behavior
- `openspec/changes/archive/2026-05-31-migrate-secp256k1-to-noble/tasks.md` — cleanup
- `src/main/api.js` — fix accounts endpoint
