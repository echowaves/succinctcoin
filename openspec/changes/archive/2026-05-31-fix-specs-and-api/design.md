## Context

The noble migration (secp256k1 → @noble/secp256k1) was completed and archived, but several artifacts and code paths were left inconsistent:
- The `crypto-utils` spec still describes PEM-format public keys (178 chars) but the code now uses hex format (64/66/130 chars)
- The `build-tooling` spec has stale version requirements (Electron 28.x vs actual 42.3.0)
- The noble migration tasks.md has 4 duplicate unchecked tasks in section 4

## Goals / Non-Goals

**Goals:**
- Update `crypto-utils` spec to reflect hex-based public key format
- Update `build-tooling` spec with current dependency versions
- Clean up duplicate tasks from noble migration archive

**Non-Goals:**
- Fixing the accounts API endpoint (no `/api/accounts` endpoint exists in the codebase — the HTML error was likely from a different endpoint or a stale observation)
- Implementing new features or blockchain changes

## Decisions

### Decision 1: Spec updates are documentation-only
The code is correct — only the spec files need updating. No code changes required.

### Decision 2: Remove duplicate tasks from archive
Section 4 of the noble migration tasks.md contains duplicates of section 3. These should be removed since they were never executed and add no value.

### Decision 3: No accounts endpoint fix needed
Investigation found no `/api/accounts` endpoint in `src/main/api.js`. The HTML error response was likely from Express's default 404 handler. No fix required.

## Risks / Trade-offs

[Risk: Spec updates don't affect running code] → Mitigation: This is intentional — specs are documentation, not code. The code is already correct.

[Risk: Removing tasks from archive may lose history] → Mitigation: The archive preserves the full git history. We're only removing duplicate unchecked items, not valid work items.
