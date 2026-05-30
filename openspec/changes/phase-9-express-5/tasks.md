# Tasks: Phase 9 — Express 5 Upgrade

## Phase 9.1: Update Dependencies

### Task 9.1.1: Update package.json
- [x] Update `express` from `4.18.1` to `5.2.1`

### Task 9.1.2: Install updated dependencies
- [x] Run `npm install` to update lock file
- [x] Verify no ELSPROBLEMS or peer dependency conflicts

## Phase 9.2: Validate Changes

### Task 9.2.1: Run tests
- [x] Run `npm test` to verify no regressions
- [x] Verify same test results as Phase 8 (4/7 suites, 108/112 tests)

### Task 9.2.2: Test app launch
- [x] Run `npm start` to verify app launches correctly
- [x] Check console for any deprecation warnings (none found)

### Task 9.2.3: Verify API endpoints
- [x] Test GET /api/blocks - works
- [x] Test GET /api/blocks/length - works
- [x] Test GET /api/blocks/:id - works
- [x] Test GET /api/mine-transactions - works (302 redirect)
- [ ] Test POST /api/transact - pre-existing bug (pubsub not configured)
- [x] Test GET /api/transaction-pool-map - works
- [x] Test GET /api/wallet-info - works

## Phase 9.3: Update Documentation

### Task 9.3.1: Update OpenSpec config
- [ ] Add Phase 9 to "Phases Completed" list in openspec/config.yaml
