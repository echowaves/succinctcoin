# Phase 4: React 19 & Security Hardening

## Why

The renderer is running on React 18 with `contextIsolation: false`, which creates:

- **Security risk**: `contextIsolation: false` exposes Node.js APIs to the renderer process
- **Missing features**: React 19 has performance improvements, new hooks, and better TypeScript support
- **Dependency rot**: React 18 has newer versions with bugfixes and security patches
- **Ecosystem alignment**: Modern React ecosystem is moving to React 19

## What Changes

### Dependencies Updated

| Package | Current | Target |
|---------|---------|--------|
| `react` | ^18.2.0 | ^19.0.0 |
| `react-dom` | ^18.3.1 | ^19.0.0 |
| `@testing-library/react` | 13.3.0 | 16.x |

### Files Modified

| File | Changes |
|------|---------|
| `src/main/index.js` | Enable `contextIsolation: true`, update preload pattern |
| `src/renderer/preload.js` | Update contextBridge usage for contextIsolation |
| `src/renderer/components/*.js` | Update deprecated React patterns |
| `package.json` | Update React dependency versions |

### React 18 → 19 Breaking Changes

Key changes to research and address:
- `ReactDOM.render()` → `createRoot()` (if still using legacy API)
- `useEffect` cleanup timing changes
- `useSyncExternalStore` changes
- Removed deprecated APIs (getDerivedStateFromProps string refs, etc.)
- PropTypes moved to separate package

### contextIsolation: true

Key changes:
- Renderer can no longer access Node.js APIs directly
- All Node.js interactions must go through `contextBridge` in preload
- Update preload script to expose necessary APIs
- Update renderer components to use `window.electronAPI` instead of direct Node.js imports

## Scope

**In scope**:
- Upgrade React from 18 to 19
- Enable `contextIsolation: true` in Electron main process
- Update preload script for secure IPC
- Update renderer components to use secure patterns
- Test all components work correctly

**Out of scope**:
- P2P networking changes (Phase 3 complete)
- New React features (Suspense, Server Components)
- TypeScript migration

## Success Criteria

1. `npm install` completes without errors
2. `npm test` passes (same results as Phase 3)
3. `npm run lint` passes with no errors
4. `npm start` launches the app with `contextIsolation: true`
5. All renderer components render correctly
6. No Node.js API access from renderer (verified by code review)

## Risks

- React 19 may have breaking changes in hooks — review migration guide carefully
- `contextIsolation: true` will break direct Node.js imports in renderer — must use preload
- PropTypes removal may require updates — move to JSDoc or separate package
- Electron 28 supports `contextIsolation: true` natively — no version upgrade needed

## Migration Steps

1. Research React 19 migration guide
2. Update package.json with new React dependency versions
3. Run `npm install` and resolve any dependency conflicts
4. Enable `contextIsolation: true` in main process
5. Update preload script to expose necessary APIs
6. Update renderer components to use `window.electronAPI`
7. Remove direct Node.js imports from renderer
8. Test all components work correctly
9. Update PropTypes to JSDoc or PropTypes package
