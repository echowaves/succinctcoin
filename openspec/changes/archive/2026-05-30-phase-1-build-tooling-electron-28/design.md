# Design: Phase 1 — Build Tooling → Electron 28

## Overview

This change upgrades the entire build tooling stack from ~2022 versions to current stable releases, targeting Electron 28 LTS as the foundation. The upgrade is scoped to build tooling only — no feature changes, no renderer modernization, no P2P upgrades.

## Architecture Decisions

### Electron 28 (not 36)

**Decision**: Stop at Electron 28 LTS.

**Rationale**:
- Electron 28 uses Node 20 (LTS), has native `fetch`, and is mature (released Jan 2024)
- Electron 36 uses Node 22 and is newer — save for Phase 4 after stabilizing
- Intermediate step lets us catch breakage in smaller increments
- Electron 28 is a long-term support release

### Electron Forge 7.x Stable (not beta)

**Decision**: Migrate from `6.0.0-beta.64` to `7.x` stable.

**Rationale**:
- The beta has been stable for years; 7.x is the official release
- Config format is largely compatible but cleaner
- Makers and plugins have stable APIs

**Config changes**:
```json
// Before (beta.64)
"config": {
  "forge": {
    "packagerConfig": {},
    "makers": [...],
    "plugins": [[...]]
  }
}

// After (7.x) — same structure, stable schema
"config": {
  "forge": {
    "packagerConfig": {},
    "makers": [...],
    "plugins": [[...]]
  }
}
```

The config structure remains the same. The main change is that 7.x validates the schema more strictly.

### ESLint 9 Flat Config

**Decision**: Replace `.eslintrc` with `eslint.config.js` using `@eslint/js`.

**Rationale**:
- ESLint 9 requires flat config (no more `.eslintrc*` files)
- `eslint-config-airbnb` is effectively deprecated
- `@eslint/js` provides the base recommended rules
- We preserve existing rule behavior by mapping airbnb rules to flat config equivalents

**Mapping**:
```js
// Old .eslintrc
{
  "extends": ["eslint:recommended", "plugin:import/errors", "plugin:import/warnings", "plugin:react-hooks/recommended", "airbnb"],
  "plugins": ["react", "jest"],
  "parser": "@babel/eslint-parser",
  "parserOptions": { "ecmaVersion": 6, "sourceType": "module", "ecmaFeatures": { "jsx": true } },
  "env": { "browser": true, "es6": true, "jquery": true, "mocha": true, "node": true, "jest": true },
  "rules": { ... }
}

// New eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import jest from 'eslint-plugin-jest'
import importPlugin from 'eslint-plugin-import'
import react from 'eslint-plugin-react'

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.es2021 },
      parser: babelParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } }
    },
    plugins: { 'react-hooks': reactHooks, jest, import: importPlugin, react },
    rules: { ... }
  }
]
```

### @vercel/webpack-asset-relocator-loader Removal

**Decision**: Try removing it. If native modules fail to resolve, add back as fallback.

**Rationale**:
- This loader was needed for older Electron versions to bundle native Node modules
- Electron 28 has better native module support via `electron-builder`'s built-in handling
- If it breaks, we add it back — it's a safe fallback

### CopyWebpackPlugin v12

**Decision**: Upgrade to v12, update config syntax.

**Rationale**:
- v12 uses a cleaner patterns API
- The `patterns` array syntax is the same, but some options changed
- Migration is straightforward: `new CopyWebpackPlugin({ patterns: [...] })` → `new CopyWebpackPlugin([...])`

### Native fetch Replacement

**Decision**: Remove `electron-fetch`, use global `fetch`.

**Rationale**:
- Electron 28 includes native `fetch` (Chromium-based)
- `electron-fetch` was a polyfill for Electron < 28
- Code change: `import fetch from 'electron-fetch'` → remove import, use global `fetch`

### Express body-parser Replacement

**Decision**: Replace `bodyParser.json()` with `express.json()`.

**Rationale**:
- Express 4.16+ has built-in body parsing
- `body-parser` is redundant
- Code change: `api.use(bodyParser.json())` → `api.use(express.json())`

### Preload Script Security

**Decision**: Migrate to `contextBridge` pattern.

**Rationale**:
- Electron 28 enforces `contextIsolation: true` by default
- Current code uses `nodeIntegration: true` + `contextIsolation: false` (works but insecure)
- Preload should expose only what the renderer needs via `contextBridge`

**Before**:
```js
// preload.js
window.ipcRenderer = require('electron').ipcRenderer
```

**After**:
```js
// preload.js
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('electronAPI', {
  // expose only what's needed
})
```

### electron-is-dev Migration

**Decision**: Replace with `app.isPackaged`.

**Rationale**:
- `electron-is-dev` is a thin wrapper around `app.isPackaged`
- Removes an unnecessary dependency
- Code change: `import isDev from 'electron-is-dev'` → `const { app } = require('electron'); app.isPackaged`

### Babel 7.26+

**Decision**: Upgrade all Babel packages to 7.26.x.

**Rationale**:
- `@babel/plugin-proposal-class-properties` is no longer needed (built into Babel 7.x)
- Other packages get bugfixes and minor improvements
- Config remains compatible

### Jest 30

**Decision**: Upgrade from 28 to 30.

**Rationale**:
- Jest 30 is the current stable
- API is compatible for our test patterns
- Test environment is Node, so Electron changes don't affect tests

## File Changes Summary

### package.json
- Update 14+ dependency versions
- Remove 4 dependencies
- Keep 5 dependencies for later phases

### eslint.config.js (new)
- Create flat config with @eslint/js
- Map existing rules from .eslintrc

### bk.eslintrc (delete)
- Remove backup ESLint config

### src/main/api.js
- Remove `body-parser` import
- Replace `bodyParser.json()` with `express.json()`
- Remove `electron-fetch` import
- Replace `fetch()` calls (already using global fetch after import removal)

### src/main/index.js
- Replace `electron-is-dev` with `app.isPackaged`

### src/renderer/preload.js
- Migrate to `contextBridge` pattern

### webpack.renderer.config.js
- Update CopyWebpackPlugin syntax for v12

### webpack.rules.js
- Remove `@vercel/webpack-asset-relocator-loader` reference (if removed from package.json)
- Update babel-loader config if needed

## Migration Order

```
1. Update package.json dependencies (lock file)
2. npm install
3. Create eslint.config.js, delete bk.eslintrc
4. Update webpack.renderer.config.js (CopyWebpackPlugin)
5. Update webpack.rules.js (remove relocator loader)
6. Update src/main/api.js (body-parser, electron-fetch)
7. Update src/main/index.js (electron-is-dev)
8. Update src/renderer/preload.js (contextBridge)
9. npm test — validate
10. npm start — validate
```

## Rollback Plan

If Phase 1 fails:
1. `git checkout -- package.json` — revert dependency changes
2. `rm -rf node_modules && npm install` — restore original deps
3. Delete `eslint.config.js`, restore `bk.eslintrc`
4. Revert code changes in api.js, index.js, preload.js, webpack configs

The git history provides a clean rollback path. No data loss risk (no schema changes, no data format changes).
