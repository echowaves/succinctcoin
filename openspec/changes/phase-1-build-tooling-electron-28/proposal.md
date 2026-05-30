# Phase 1: Build Tooling — Electron 28

## Why

The SuccinctCoin codebase is running on Electron 19.0.8 (Jan 2022) with `electron-forge` 6.0.0-beta.64 — a beta version from the same era. This creates:

- **Security risk**: Electron 19 has known vulnerabilities patched in later versions
- **Missing APIs**: Native `fetch`, modern Node.js APIs, better security defaults
- **Dependency rot**: Babel 7.18, ESLint 8.x, outdated webpack plugins
- **Maintenance burden**: Beta tooling, deprecated configs, no security patches

## What Changes

### Dependencies Updated

| Package | Current | Target |
|---------|---------|--------|
| `electron` | 19.0.8 | 28.x LTS |
| `@electron-forge/*` | 6.0.0-beta.64 | 7.x stable |
| `@babel/*` | 7.18.x | 7.26.x |
| `eslint` | 8.x | 9.x (flat config) |
| `jest` | 28.1.2 | 30.x |
| `babel-loader` | 8.2.5 | 9.x |
| `copy-webpack-plugin` | 11.0.0 | 12.x |
| `css-loader` | 6.7.1 | 7.x |
| `style-loader` | 3.3.1 | 4.x |
| `@testing-library/react` | 13.3.0 | 16.x |
| `react-router-dom` | 6.3.0 | 6.x latest |
| `react-bootstrap` | 2.4.0 | 2.x latest |
| `bootstrap` | 5.2.0 | 5.3.x |
| `concurrently` | 7.2.2 | latest |

### Dependencies Removed

- `electron-fetch` — native `fetch` available in Electron 28
- `body-parser` — built into Express since 4.16
- `@vercel/webpack-asset-relocator-loader` — not needed with Electron 28
- `@babel/plugin-proposal-class-properties` — built into Babel 7.x
- `eslint-config-airbnb` — replaced by `@eslint/js`

### Dependencies Kept (for later phases)

- `libp2p` + all p2p dependencies → Phase 3
- `moment` → Phase 2 (replace with dayjs)
- `obj2fs-hoc` → custom disk persistence wrapper, keep
- `flash-store` → keep
- `electron-squirrel-startup` → keep for now
- `electron-is-dev` → migrate to `app.isPackaged`

### ESLint Migration

- Delete `bk.eslintrc` (backup file)
- Create `eslint.config.js` (flat config) with `@eslint/js` + plugins
- Preserve existing rule behavior where possible

## Scope

**In scope**: Build tooling, dependency updates, config migrations, webpack tweaks, preload security pattern, ESLint flat config.

**Out of scope**:
- Renderer component modernization (Phase 2)
- P2P networking upgrade (Phase 3)
- `contextIsolation: true` enforcement (Phase 4)
- moment.js → dayjs (Phase 2)

## Success Criteria

1. `npm install` completes without errors
2. `npm test` passes (Jest in Node environment)
3. `npm start` launches the app in dev mode
4. ESLint runs with flat config, no errors
5. No console errors or warnings related to build tooling

## Risks

- `@vercel/webpack-asset-relocator-loader` removal may break native module resolution — have fallback ready
- Electron-forge 7.x config format may differ from beta — documented migration path exists
- ESLint 9 flat config may have breaking rule changes — audit rules carefully
- CopyWebpackPlugin v12 API changes — minor config update needed
