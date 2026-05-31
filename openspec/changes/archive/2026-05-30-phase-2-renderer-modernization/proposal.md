# Phase 2: Renderer Modernization

## Why

The renderer UI has several areas that need modernization:

1. **moment.js** — 300KB dependency used only for `moment.utc().valueOf()` (equivalent to `Date.now()`). Replacing with dayjs keeps the API familiar while reducing bundle size.

2. **Class Components** — 4 components still use the ClassComponent pattern (`Block`, `Blocks`, `TransactionPool`, `ConductTransaction`). Converting to functional components with hooks aligns with modern React patterns and improves maintainability.

3. **Outdated Dependencies** — react-router-dom 6.3.0, react-bootstrap 2.4.0, and bootstrap 5.2.0 have newer versions with bugfixes and security patches.

## What Changes

### Dependencies Updated

| Package | Current | Target |
|---------|---------|--------|
| `dayjs` | (new) | ^1.11.x |
| `moment` | 2.29.4 | (removed) |
| `react-router-dom` | ^6.28.0 | ^6.30.x |
| `react-bootstrap` | ^2.10.7 | ^2.10.x latest |
| `bootstrap` | ^5.3.3 | ^5.3.5 |

### Dependencies Kept

- `HashRouter` — needed for `file://` protocol support
- `React 18` — saving React 19 for Phase 4
- `@testing-library/react` — already on v16

### Components Converted

| Component | Current | Target | Complexity |
|-----------|---------|--------|------------|
| `Block` | ClassComponent | Functional + useState | Low |
| `ConductTransaction` | ClassComponent | Functional + useState | Medium |
| `TransactionPool` | ClassComponent | Functional + useState + useEffect | Medium |
| `Blocks` | ClassComponent | Functional + useState | Medium-High |

### moment.js → dayjs

```
Before:
  this.timestamp = moment.utc().valueOf()
  moment().format('YYYY-MM-DD')

After:
  this.timestamp = dayjs().utc().valueOf()
  dayjs().format('YYYY-MM-DD')
```

## Scope

**In scope**:
- Add dayjs, remove moment
- Convert 4 ClassComponents to functional components
- Update react-router-dom, react-bootstrap, bootstrap versions
- Test after each component conversion

**Out of scope**:
- HashRouter → BrowserRouter (keep HashRouter for file:// support)
- React 19 upgrade (save for Phase 4)
- Electron 36 upgrade (save for Phase 4)
- P2P networking changes (Phase 3)

## Success Criteria

1. `npm install` completes without errors
2. `npm test` passes (same results as Phase 1)
3. All 4 ClassComponents converted to functional components
4. moment.js fully replaced with dayjs
5. App launches and renders correctly via `file://` protocol
6. No console errors or warnings related to renderer changes

## Risks

- Class→Hook conversion may reveal hidden state dependencies — convert one at a time, test after each
- dayjs API is nearly identical to moment, but edge cases may exist — audit all usages
- react-router-dom 6.30.x may have minor breaking changes — review migration guide
- Bootstrap 5.3.x CSS class changes — verify UI renders correctly

## Conversion Order

```
Block (simplest) → ConductTransaction (form) → TransactionPool (polling) → Blocks (pagination, most complex)
```

Each conversion follows this pattern:
1. Convert class fields → useState
2. Convert componentDidMount → useEffect
3. Convert componentWillUnmount → useEffect cleanup
4. Convert class methods → useCallback/useCallback
5. Run tests
6. Verify UI renders correctly
