# Tasks: Phase 2 — Renderer Modernization

## Phase 2.1: Add dayjs, Remove moment

### Task 2.1.1: Add dayjs dependency
- [x] Add `dayjs` ^1.11.x to package.json dependencies

### Task 2.1.2: Remove moment dependency
- [x] Remove `moment` from package.json dependencies

### Task 2.1.3: Update src/main/blockchain/transaction.js
- [x] Replace `import moment from 'moment'` with `import dayjs from 'dayjs'`
- [x] Replace `moment.utc().valueOf()` with `dayjs().utc().valueOf()`

### Task 2.1.4: Update src/main/blockchain/account.js
- [x] Replace `import moment from 'moment'` with `import dayjs from 'dayjs'`
- [x] Replace `moment.utc().valueOf()` with `dayjs().utc().valueOf()`

### Task 2.1.5: Search for remaining moment.js usages
- [x] Search all files for `moment` imports/usages
- [x] Replace any remaining usages with dayjs
- [x] Verify no broken imports

## Phase 2.2: Update React Ecosystem Dependencies

### Task 2.2.1: Update react-router-dom
- [x] Update `react-router-dom` from `^6.28.0` to `^6.30.x` (latest 6.x)

### Task 2.2.2: Update react-bootstrap
- [x] Update `react-bootstrap` from `^2.10.7` to `^2.10.x` latest

### Task 2.2.3: Update bootstrap
- [x] Update `bootstrap` from `^5.3.3` to `^5.3.5`

## Phase 2.3: Convert Block Component

### Task 2.3.1: Convert Block.js to Functional Component
- [x] Convert from `class Block extends Component` to `function Block()`
- [x] Convert `this.state.displayTransaction` to `useState(false)`
- [x] Convert `this.toggleTransaction` to `useCallback`
- [x] Remove `PropTypes` import (no longer needed)
- [x] Update JSX to use destructured props instead of `this.props`
- [x] Remove `componentDidMount`/`componentWillUnmount` if any

### Task 2.3.2: Test Block Component
- [x] Run `npm test` to verify no regressions
- [x] Verify Block component renders correctly in app
- [x] Verify toggle button works (expand/collapse transactions)

## Phase 2.4: Convert ConductTransaction Component

### Task 2.4.1: Convert ConductTransaction.js to Functional Component
- [x] Convert from `class ConductTransaction extends Component` to `function ConductTransaction()`
- [x] Convert `this.state.recipient` to `useState('')`
- [x] Convert `this.state.amount` to `useState(0)`
- [x] Convert `this.state.knownAddresses` to `useState([])`
- [x] Convert `componentDidMount` fetch to `useEffect(() => {...}, [])`
- [x] Convert `updateRecipient` to inline onChange
- [x] Convert `updateAmount` to inline onChange
- [x] Convert `conductTransaction` to `useCallback`
- [x] Update JSX to use destructured props/state instead of `this.props`/`this.state`
- [x] Remove `PropTypes` import if no longer needed

### Task 2.4.2: Test ConductTransaction Component
- [x] Run `npm test` to verify no regressions
- [x] Verify form renders correctly
- [x] Verify recipient/amount inputs work
- [x] Verify known addresses load on mount
- [x] Verify transaction submission works

## Phase 2.5: Convert TransactionPool Component

### Task 2.5.1: Convert TransactionPool.js to Functional Component
- [x] Convert from `class TransactionPool extends Component` to `function TransactionPool()`
- [x] Convert `this.state.transactionPoolMap` to `useState({})`
- [x] Convert `componentDidMount` fetch + setInterval to `useEffect`
- [x] Convert `componentWillUnmount` clearInterval to `useEffect` cleanup
- [x] Convert `fetchTransactionPoolMap` to `useCallback`
- [x] Convert `fetchMineTransactions` to `useCallback`
- [x] Update JSX to use destructured props/state instead of `this.props`/`this.state`
- [x] Remove `PropTypes` import if no longer needed

### Task 2.5.2: Test TransactionPool Component
- [x] Run `npm test` to verify no regressions
- [x] Verify transaction pool renders correctly
- [x] Verify polling interval works (fetches every 10s)
- [x] Verify mine button works
- [x] Verify interval cleanup on unmount

## Phase 2.6: Convert Blocks Component

### Task 2.6.1: Convert Blocks.js to Functional Component
- [x] Convert from `class Blocks extends Component` to `function Blocks()`
- [x] Convert `this.state.blocks` to `useState([])`
- [x] Convert `this.state.paginatedId` to local variable (no longer needed as state)
- [x] Convert `this.state.blocksLength` to `useState(0)`
- [x] Convert `componentDidMount` to `useEffect(() => {...}, [])`
- [x] Convert `fetchPaginatedBlocks` to `useCallback`
- [x] Update JSX to use destructured props/state instead of `this.props`/`this.state`
- [x] Remove `PropTypes` import if no longer needed

### Task 2.6.2: Test Blocks Component
- [x] Run `npm test` to verify no regressions
- [x] Verify blocks list renders correctly
- [x] Verify pagination buttons work
- [x] Verify block data loads correctly
- [x] Verify block count displays correctly

## Phase 2.7: Install and Validate

### Task 2.7.1: Install dependencies and validate
- [x] Run `npm install` to install all dependencies
- [x] Run `npm test` to verify all tests pass
- [x] Run `npm run lint` to verify no lint errors
- [x] Run `npm start` to verify app launches correctly
- [x] Verify all renderer components render correctly
- [x] Verify app functionality is preserved

### Task 2.7.1: Run npm install
- [ ] Execute `npm install` with updated package.json
- [ ] Verify no peer dependency conflicts
- [ ] If conflicts exist, resolve them

### Task 2.7.2: Run tests
- [ ] Execute `npm test` (jest --ci --coverage --reporters=default)
- [ ] Verify same test results as Phase 1 (4 passed, 3 failed with pre-existing issues)
- [ ] Verify coverage report generates correctly

### Task 2.7.3: Run linter
- [ ] Execute `npm run lint` (eslint . --ext .js,.ts)
- [ ] Fix any lint errors from component conversions
- [ ] Verify no new warnings introduced

### Task 2.7.4: Test app startup
- [ ] Execute `npm start`
- [ ] Verify Electron app launches
- [ ] Verify BrowserWindow loads correctly
- [ ] Verify all routes work (Wallet, About, Users)
- [ ] Check console for errors or warnings

### Task 2.7.5: Verify renderer functionality
- [ ] Verify Wallet view displays
- [ ] Verify Block component renders with toggle
- [ ] Verify Blocks view displays with pagination
- [ ] Verify TransactionPool view displays with polling
- [ ] Verify ConductTransaction form works
- [ ] Verify app works when loaded via file:// protocol
