# Tasks: Phase 4 — React 19 & Security Hardening

## Phase 4.1: Upgrade React to v19

### Task 4.1.1: Update package.json
- [x] Update `react` from `^18.2.0` to `^19.0.0`
- [x] Update `react-dom` from `^18.3.1` to `^19.0.0`
- [x] Update `@testing-library/react` to latest compatible version

### Task 4.1.2: Install updated dependencies
- [x] Run `npm install` to install updated packages
- [x] Verify no peer dependency conflicts

### Task 4.1.3: Update React API usage
- [x] Check for deprecated React patterns (getDerivedStateFromProps, string refs, etc.)
- [x] Update useEffect cleanup timing if needed
- [x] Replace PropTypes with JSDoc or @prop-types package

## Phase 4.2: Enable contextIsolation

### Task 4.2.1: Update main process
- [x] Change `contextIsolation: false` to `contextIsolation: true` in index.js
- [x] Verify preload script is properly configured

### Task 4.2.2: Update preload script
- [x] Review current preload script
- [x] Ensure all necessary APIs are exposed via contextBridge
- [x] Remove any direct Node.js API access from renderer

### Task 4.2.3: Update renderer components
- [x] Remove direct Node.js imports from renderer components
- [x] Update all IPC calls to use `window.electronAPI`
- [x] Verify all components work with contextIsolation enabled

## Phase 4.3: Validate Changes

### Task 4.3.1: Run tests
- [x] Run `npm test` to verify no regressions
- [x] Verify same test results as Phase 3 (4 passed, 3 failed with pre-existing issues)

### Task 4.3.2: Run linter
- [x] Run `npm run lint` to verify no lint errors

### Task 4.3.3: Test app launch
- [ ] Run `npm start` to verify app launches with contextIsolation: true
- [ ] Verify all renderer components render correctly
- [ ] Verify no Node.js API access from renderer console
