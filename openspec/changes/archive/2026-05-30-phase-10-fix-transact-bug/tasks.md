# Tasks: Phase 10 — Fix POST /api/transact Bug

## Phase 10.1: Fix pubsub.js

### Task 10.1.1: Ensure rooms are created before peer discovery
- [x] Move `this.blockChainRoom = new Room(...)` before peer discovery code
- [x] Move `this.transactionRoom = new Room(...)` before peer discovery code
- [x] Ensure rooms exist even if peer discovery fails

## Phase 10.2: Fix api.js

### Task 10.2.1: Fix async pattern in /api/transact
- [x] Remove fire-and-forget IIFE wrapper
- [x] Make handler `async`
- [x] `await` the transaction creation and validation
- [x] Move `pubsub.broadcastTransaction()` inside try block after transaction is created
- [x] Move `res.json()` inside try block after transaction is set

### Task 10.2.2: Fix error handling
- [x] Ensure error response is sent before any other response
- [x] Remove duplicate response attempts
- [x] Verify no ERR_HTTP_HEADERS_SENT errors

## Phase 10.3: Validate Changes

### Task 10.3.1: Run tests
- [x] Run `npm test` to verify no regressions
- [x] Verify test results (107/112 pass, transaction-pool.test.js now passes)

### Task 10.3.2: Test app launch
- [x] Run `npm start` to verify app launches correctly
- [x] Check console for errors

### Task 10.3.3: Test transaction endpoint
- [x] Send POST /api/transact with valid data
- [x] Verify response: `{ type: 'success', transaction }`
- [x] Verify transaction appears in transaction pool
- [x] Verify no ERR_HTTP_HEADERS_SENT errors
- [x] Verify no unhandled promise rejections

## Phase 10.4: Update Documentation

### Task 10.4.1: Update OpenSpec config
- [ ] Add Phase 10 to "Phases Completed" list in openspec/config.yaml
