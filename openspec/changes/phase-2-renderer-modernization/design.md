# Design: Phase 2 — Renderer Modernization

## Overview

This change modernizes the renderer UI by:
1. Replacing moment.js with dayjs
2. Converting 4 ClassComponents to functional components with hooks
3. Updating React ecosystem dependencies

## Architecture Decisions

### HashRouter Retained

**Decision**: Keep HashRouter for `file://` protocol support.

**Rationale**:
- The app needs to work when loaded via `file://` protocol (not just http://localhost)
- BrowserRouter requires a server that returns index.html for all routes
- HashRouter uses URL hash (#) for routing, which works with file://
- No change needed to routing structure

```
Current (kept):
<HashRouter>
  <Routes>
    <Route path="/" element={<Wallet />}/>
    <Route path="/about" element={<About />}/>
    <Route path="/users" element={<Users />}/>
  </Routes>
</HashRouter>
```

### dayjs Over Native Date

**Decision**: Use dayjs instead of native Date.

**Rationale**:
- moment.js is used for `.valueOf()` (Unix timestamp) and potentially `.format()` elsewhere
- dayjs provides a drop-in API replacement with minimal bundle impact (~2KB gzipped)
- Native Date would require writing custom formatting helpers
- dayjs preserves existing code patterns, reducing conversion risk

**Migration Pattern**:
```js
// Before
import moment from 'moment'
moment.utc().valueOf()
moment().format('YYYY-MM-DD')

// After
import dayjs from 'dayjs'
dayjs().utc().valueOf()
dayjs().format('YYYY-MM-DD')
```

### Component Conversion Strategy

**Decision**: Convert one component at a time, test after each.

**Rationale**:
- Isolates failures to individual components
- Tests pass after each conversion provides confidence
- Easier to debug if something breaks
- Allows incremental validation of UI behavior

**Conversion Pattern**:
```js
// Before (ClassComponent)
class MyComponent extends Component {
  constructor(props) {
    super(props)
    this.state = { data: [], loading: false }
  }
  
  componentDidMount() {
    fetchData().then(data => this.setState({ data }))
  }
  
  componentWillUnmount() {
    clearInterval(this.interval)
  }
  
  handleClick = () => {
    this.setState({ loading: true })
  }
  
  render() {
    const { data, loading } = this.state
    return <div>{loading ? 'Loading...' : data}</div>
  }
}

// After (Functional Component)
function MyComponent() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    fetchData().then(data => setData(data))
    return () => clearInterval(interval)
  }, [])
  
  const handleClick = useCallback(() => {
    setLoading(true)
  }, [])
  
  return <div>{loading ? 'Loading...' : data}</div>
}
```

### Component Conversion Order

```
1. Block (simplest)
   - Single state: displayTransaction (boolean)
   - Single method: toggleTransaction
   - No lifecycle methods
   - Pure presentational with toggle

2. ConductTransaction (form)
   - Three state fields: recipient, amount, knownAddresses
   - componentDidMount: fetch known addresses
   - Form handlers: updateRecipient, updateAmount
   - Submit handler: conductTransaction
   - API call to /api/transact

3. TransactionPool (polling)
   - Single state: transactionPoolMap
   - componentDidMount: fetch + setInterval
   - componentWillUnmount: clearInterval
   - fetchTransactionPoolMap: fetch + setState
   - fetchMineTransactions: fetch + alert
   - Polling interval: 10000ms

4. Blocks (pagination, most complex)
   - Three state fields: blocks, paginatedId, blocksLength
   - componentDidMount: fetch length + fetch blocks
   - fetchPaginatedBlocks: curried function for pagination
   - Render: dynamic page buttons + block list
   - Block component rendering with Transaction expansion
```

### Dependency Update Strategy

**Decision**: Update react-router-dom, react-bootstrap, and bootstrap in one batch.

**Rationale**:
- These dependencies are tightly coupled (react-bootstrap depends on bootstrap)
- react-router-dom and react-bootstrap have compatible version ranges
- Updating together avoids intermediate broken states
- No code changes needed for these updates (API stable)

### Testing Strategy

**Decision**: Run tests after each component conversion.

```
After Block conversion:
  - Verify Block component renders
  - Verify toggle works
  - Run full test suite

After ConductTransaction conversion:
  - Verify form renders
  - Verify form handlers work
  - Run full test suite

After TransactionPool conversion:
  - Verify pool renders
  - Verify polling works
  - Verify mine button works
  - Run full test suite

After Blocks conversion:
  - Verify blocks list renders
  - Verify pagination works
  - Run full test suite
```

## File Changes Summary

### package.json
- Add `dayjs`: `^1.11.x`
- Remove `moment`: `2.29.4`
- Update `react-router-dom`: `^6.28.0` → `^6.30.x`
- Update `react-bootstrap`: `^2.10.7` → `^2.10.x latest`
- Update `bootstrap`: `^5.3.3` → `^5.3.5`

### src/main/blockchain/transaction.js
- Replace `import moment from 'moment'` with `import dayjs from 'dayjs'`
- Replace `moment.utc().valueOf()` with `dayjs().utc().valueOf()`

### src/main/blockchain/account.js
- Replace `import moment from 'moment'` with `import dayjs from 'dayjs'`
- Replace `moment.utc().valueOf()` with `dayjs().utc().valueOf()`

### src/renderer/components/Block.js
- Convert from ClassComponent to Functional Component
- Convert `displayTransaction` state to `useState`
- Convert `toggleTransaction` method to `useCallback`

### src/renderer/components/ConductTransaction.js
- Convert from ClassComponent to Functional Component
- Convert `recipient`, `amount`, `knownAddresses` states to `useState`
- Convert `componentDidMount` fetch to `useEffect`
- Convert form handlers to `useCallback`

### src/renderer/components/TransactionPool.js
- Convert from ClassComponent to Functional Component
- Convert `transactionPoolMap` state to `useState`
- Convert `componentDidMount` + `setInterval` to `useEffect`
- Convert `componentWillUnmount` + `clearInterval` to `useEffect` cleanup
- Convert fetch methods to `useCallback`

### src/renderer/components/Blocks.js
- Convert from ClassComponent to Functional Component
- Convert `blocks`, `paginatedId`, `blocksLength` states to `useState`
- Convert `componentDidMount` fetch to `useEffect`
- Convert `fetchPaginatedBlocks` curried function to `useCallback`

## Rollback Plan

If Phase 2 fails:
1. `git checkout -- package.json` — revert dependency changes
2. `git checkout -- src/` — revert all source code changes
3. `rm -rf node_modules && npm install` — restore original deps
4. Repeat step 2

The git history provides a clean rollback path. No data loss risk (no schema changes, no data format changes).
