## Context

Current `webPreferences` in `src/main/index.js` has `nodeIntegration: true` and `contextIsolation: true`. The `webSecurity` flag is commented out. Previous OpenSpec phases (4, 6, 7) planned to disable nodeIntegration but the tasks were never completed.

Renderer currently accesses main process through `window.electronAPI` (preload bridge) for wallet info. A grep audit shows no direct Node.js API usage (`require()`, `process.*`, `__dirname`) in renderer components — only preload.js uses `require('electron')` which is correct behavior.

## Goals / Non-Goals

**Goals:**
- Set `nodeIntegration: false` in BrowserWindow webPreferences
- Enable `webSecurity: true` in BrowserWindow webPreferences
- Verify all renderer components continue to function correctly
- Update `electron-app` spec with security requirements

**Non-Goals:**
- Private key encryption (issue #2, separate change)
- API authentication or rate limiting (issue #22, separate change)
- Consensus mechanism implementation (issue #3, separate change)

## Decisions

- **Disable nodeIntegration unconditionally**: No runtime toggle. Renderer should never need Node.js access. If a feature requires it, add a dedicated IPC channel through preload.
- **Enable webSecurity unconditionally**: App loads only local webpack entry. No external URLs. Same-origin policy adds defense-in-depth.
- **No renderer API changes needed**: Audit confirms renderer uses `window.electronAPI` bridge exclusively. No `require()` calls in components. Preload whitelists are sufficient.

## Risks / Trade-offs

- [Renderer breaks silently if it depends on Node.js globals] → Mitigation: manual smoke test (`npm start`) covering all routes before committing. Check DevTools console for errors.
- [WebSecurity may block local asset loading] → Mitigation: all assets served from same webpack origin. `../static/assets/logo.png` in App.js uses relative path within same origin — should work.
