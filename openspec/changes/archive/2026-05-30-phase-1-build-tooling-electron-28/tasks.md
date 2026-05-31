# Tasks: Phase 1 — Build Tooling → Electron 28

## Phase 1.1: Package.json Dependency Updates

### Task 1.1.1: Update Electron Forge dependencies
- [x] Update `@electron-forge/cli` from `^6.0.0-beta.64` to `^7.4.0`
- [x] Update `@electron-forge/maker-squirrel` from `^6.0.0-beta.64` to `^7.4.0`
- [x] Update `@electron-forge/maker-zip` from `^6.0.0-beta.64` to `^7.4.0`
- [x] Update `@electron-forge/maker-deb` from `^6.0.0-beta.64` to `^7.4.0`
- [x] Update `@electron-forge/maker-rpm` from `^6.0.0-beta.64` to `^7.4.0`
- [x] Update `@electron-forge/plugin-webpack` from `6.0.0-beta.64` to `^7.4.0`

### Task 1.1.2: Update Electron
- [x] Update `electron` from `19.0.8` to `28.2.0` (or latest 28.x LTS)

### Task 1.1.3: Update Babel dependencies
- [x] Update `@babel/core` from `^7.18.9` to `^7.26.0`
- [x] Update `@babel/preset-env` from `7.18.6` to `^7.26.0`
- [x] Update `@babel/preset-react` from `7.18.6` to `^7.26.0`
- [x] Update `@babel/plugin-transform-runtime` from `7.18.6` to `^7.26.0`
- [x] Update `@babel/eslint-parser` from `^7.18.9` to `^7.25.9`
- [x] **Remove** `@babel/plugin-proposal-class-properties` (built into Babel 7.x)

### Task 1.1.4: Update ESLint and related
- [x] Update `eslint` from `^8.20.0` to `^9.17.0`
- [x] **Remove** `eslint-config-airbnb` (replaced by @eslint/js)
- [x] Update `eslint-config-prettier` from `8.5.0` to `^10.0.0`
- [x] Update `eslint-plugin-import` from `2.26.0` to `^2.31.0`
- [x] Update `eslint-plugin-jest` from `26.5.3` to `^28.9.0`
- [x] Update `eslint-plugin-jsx-a11y` from `6.6.0` to `^6.10.0`
- [x] Update `eslint-plugin-react` from `7.30.1` to `^7.37.0`
- [x] Update `eslint-plugin-react-hooks` from `4.6.0` to `^5.1.0`

### Task 1.1.5: Update Webpack plugins
- [x] Update `babel-loader` from `^8.2.5` to `^9.2.1`
- [x] Update `copy-webpack-plugin` from `^11.0.0` to `^12.0.2`
- [x] Update `css-loader` from `6.7.1` to `^7.1.2`
- [x] Update `style-loader` from `^3.3.1` to `^4.0.0`
- [x] Update `node-loader` from `^2.0.0` to `^2.1.0`
- [x] **Remove** `@vercel/webpack-asset-relocator-loader` (try removing, add back if needed)

### Task 1.1.6: Update test dependencies
- [x] Update `jest` from `28.1.2` to `30.1.0`
- [x] Update `@testing-library/react` from `13.3.0` to `^16.1.0`

### Task 1.1.7: Update runtime dependencies
- [x] Update `react-router-dom` from `6.3.0` to `^6.28.0`
- [x] Update `react-bootstrap` from `2.4.0` to `^2.10.7`
- [x] Update `bootstrap` from `5.2.0` to `^5.3.3`
- [x] Update `concurrently` from `7.2.2` to `^9.1.0`

### Task 1.1.8: Remove unnecessary dependencies
- [x] **Remove** `electron-fetch` (native fetch in Electron 28)
- [x] **Remove** `body-parser` (built into Express 4.16+)
- [x] **Remove** `@vercel/webpack-asset-relocator-loader` (not needed with Electron 28)
- [x] **Remove** `@babel/plugin-proposal-class-properties` (built into Babel 7.x)
- [x] **Remove** `eslint-config-airbnb` (replaced by @eslint/js)
- [x] **Remove** `@libp2p/floodsub` (replaced by gossipsub in Phase 3)
- [x] **Remove** `@libp2p/mdns` (restructured in libp2p 1.x)
- [x] **Remove** `@libp2p/mplex` (replaced by yamux in libp2p 1.x)
- [x] **Remove** `ipfs-pubsub-room` (custom implementation in Phase 3)

## Phase 1.2: Create ESLint Flat Config

### Task 1.2.1: Create eslint.config.js
- [x] Create `eslint.config.js` with `@eslint/js` base config
- [x] Configure `globals` for node, browser, es2021
- [x] Configure `@babel/eslint-parser` for JSX and ES modules
- [x] Add plugins: `react-hooks`, `jest`, `import`, `react`
- [x] Map existing rules from `bk.eslintrc` to flat config format
- [x] Preserve all existing rule behaviors where possible

### Task 1.2.2: Remove legacy ESLint config
- [x] Delete `bk.eslintrc` (backup file)

## Phase 1.3: Update Webpack Configs

### Task 1.3.1: Update webpack.renderer.config.js
- [x] Update CopyWebpackPlugin v12 syntax
- [x] Change `new CopyWebpackPlugin({ patterns: [...] })` to `new CopyWebpackPlugin([...])`

### Task 1.3.2: Update webpack.rules.js
- [x] Remove `@vercel/webpack-asset-relocator-loader` rule (if dependency removed)
- [x] Update babel-loader config for babel-loader v9 compatibility

### Task 1.3.3: Update webpack.main.config.js
- [x] Review for compatibility with new webpack/Electron versions

## Phase 1.4: Update Source Code

### Task 1.4.1: Update src/main/api.js
- [x] Remove `const bodyParser = require('body-parser')` import
- [x] Replace `api.use(bodyParser.json())` with `api.use(express.json())`
- [x] Remove `import fetch from 'electron-fetch'` import
- [x] Verify all `fetch()` calls work with global fetch

### Task 1.4.2: Update src/main/index.js
- [x] Remove `import isDev from 'electron-is-dev'` import
- [x] Replace `isDev` usage with `app.isPackaged` from `require('electron')`

### Task 1.4.3: Update src/renderer/preload.js
- [x] Migrate from `window.ipcRenderer = require('electron').ipcRenderer` to `contextBridge` pattern
- [x] Use `contextBridge.exposeInMainWorld('electronAPI', {...})`
- [x] Expose only necessary IPC methods

### Task 1.4.4: Update renderer components that use electron-fetch
- [x] Review all renderer components for `electron-fetch` imports
- [x] Update Wallet.js to use `window.electronAPI` instead of `window.ipcRenderer`
- [x] Remove any `electron-fetch` imports (global fetch will work)

### Task 1.4.5: Update renderer components that use electron-is-dev
- [x] Review renderer for `electron-is-dev` usage
- [x] Replace with appropriate alternative if needed

## Phase 1.5: Install and Validate

### Task 1.5.1: Run npm install
- [x] Execute `npm install` with updated package.json
- [x] Verify no peer dependency conflicts
- [x] If conflicts exist, resolve them (may need to adjust specific versions)

### Task 1.5.2: Run tests
- [x] Execute `npm test` (jest --ci --coverage --reporters=default)
- [x] Fix any test failures (Jest 30 API: .toThrowError → .toThrow)
- [x] Verify coverage report generates correctly

### Task 1.5.3: Run linter
- [x] Execute `npm run lint` (eslint . --ext .js,.ts)
- [x] Fix any lint errors from flat config migration
- [x] Verify no new warnings introduced
- [x] Added webpack globals to ESLint config
- [x] Added out/ to ESLint ignores

### Task 1.5.4: Test app startup
- [x] Execute `npm start`
- [x] Verify Electron app launches
- [x] Verify BrowserWindow loads correctly
- [x] Verify Express API server starts
- [x] Check console for errors or warnings

### Task 1.5.5: Verify renderer functionality
- [x] Verify React components render in the window
- [x] Verify navigation between routes works
- [x] Verify wallet view displays
- [x] Verify blocks view displays
- [x] Verify transaction pool view displays
- [x] Verify conduct transaction form works

## Phase 1.6: Cleanup


## Estimated Effort

| Phase | Estimated Time | Risk |
|-------|---------------|------|
| 1.1 Package.json updates | 15 min | Low |
| 1.2 ESLint flat config | 30 min | Medium |
| 1.3 Webpack config updates | 20 min | Low-Medium |
| 1.4 Source code updates | 30 min | Low |
| 1.5 Install and validate | 30 min | Medium |
| 1.6 Cleanup | 15 min | Low |
| **Total** | **~2 hours** | **Medium** |

## Rollback Steps

If Phase 1 fails:
1. `git checkout -- package.json` — revert dependency changes
2. `rm -rf node_modules && npm install` — restore original deps
3. `rm eslint.config.js && cp bk.eslintrc .eslintrc` — restore ESLint
4. `git checkout -- src/ webpack.*.js` — revert code changes
5. Repeat step 2
