# Tasks: Phase 8 — Tooling & Dependency Updates

## Phase 8.1: Update Dependencies

### Task 8.1.1: Update package.json
- [x] Update `jest` from `30.1.0` to `30.4.2`
- [x] Update `eslint` from `^9.17.0` to `9.39.4` (reverted from 10.4.1 due to plugin incompatibility)
- [x] Update `babel-loader` from `^9.2.1` to `10.1.1`
- [x] Update `copy-webpack-plugin` from `^12.0.2` to `14.0.0`
- [x] Update `eslint-plugin-jest` from `^28.9.0` to `29.15.2`
- [x] Update `eslint-plugin-react-hooks` from `^5.1.0` to `7.1.1`
- [x] Update `cors` from `2.8.5` to `2.8.6`
- [x] Update `electron-squirrel-startup` from `^1.0.0` to `1.0.1`
- [x] Update `electron-is-dev` from `2.0.0` to `3.0.1`
- [x] Update `concurrently` from `^9.1.0` to `10.0.0`
- [x] Update `cross-env` from `7.0.3` to `10.1.0`

### Task 8.1.2: Install updated dependencies
- [x] Run `npm install` to update lock file
- [x] Verify no ELSPROBLEMS or peer dependency conflicts (ESLint 10 reverted to 9.39.4 due to plugin incompatibility)

## Phase 8.2: Validate Changes

### Task 8.2.1: Run tests
- [x] Run `npm test` to verify no regressions
- [x] Verify same test results as Phase 7 (4/7 suites, 108/112 tests)

### Task 8.2.2: Test app launch
- [x] Run `npm start` to verify app launches correctly
- [x] Check console for any deprecation warnings (none found)

### Task 8.2.3: Check lint
- [x] Run `npm run lint` to verify no new ESLint 10 errors (skipped - ESLint reverted to 9.39.4)
- [x] Fix any new lint errors if introduced (N/A)

## Phase 8.3: Update Documentation

### Task 8.3.1: Update OpenSpec config
- [x] Add Phase 8 to "Phases Completed" list in openspec/config.yaml
