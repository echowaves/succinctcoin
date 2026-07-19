## Why

Renderer runs with `nodeIntegration: true`, giving full Node.js API access to the React UI. This means any XSS vector (malicious peer data rendered to DOM, compromised dependency) becomes remote code execution on the user's machine — critical for a cryptocurrency app handling private keys.

Previous phases (4, 6, 7) planned to disable nodeIntegration but never completed the task. `webSecurity` is also commented out.

## What Changes

- Disable `nodeIntegration` in BrowserWindow webPreferences (`src/main/index.js`)
- Enable `webSecurity: true` in BrowserWindow webPreferences
- Audit renderer code for direct Node.js API usage and migrate to preload IPC bridge where needed
- Update preload.js to expose any missing APIs the renderer needs via `contextBridge`
- Verify app launches and all renderer components work correctly

## Capabilities

### New Capabilities

(None — this hardens an existing capability)

### Modified Capabilities

- `electron-app`: Add security requirements — `nodeIntegration` must be `false`, `webSecurity` must be `true`, renderer must not access Node.js APIs directly

## Impact

- **`src/main/index.js`**: Change `webPreferences` on BrowserWindow creation
- **`src/renderer/preload.js`**: May need additional IPC channels if renderer discovers Node.js dependencies
- **Renderer components**: Audit all 6 components under `src/renderer/components/` for `require()`, `process.*`, `__dirname` usage
- **Testing**: Manual verification required — `npm start` and navigate all screens
