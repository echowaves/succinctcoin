## 1. Audit Renderer for Node.js API Usage

- [x] 1.1 Grep all files under `src/renderer/` for `require()`, `process.*`, `__dirname`, `__filename` usage
- [x] 1.2 Identify any renderer component that depends on Node.js globals and document findings

## 2. Disable nodeIntegration and Enable webSecurity

- [x] 2.1 Change `nodeIntegration: true` to `nodeIntegration: false` in `src/main/index.js` BrowserWindow webPreferences
- [x] 2.2 Uncomment and set `webSecurity: true` in `src/main/index.js` BrowserWindow webPreferences

## 3. Preload Bridge Verification

- [x] 3.1 Verify `src/renderer/preload.js` exposes all IPC channels needed by renderer components
- [x] 3.2 Confirm `Wallet.js` `window.electronAPI.sendSync('/api/wallet-info')` still works with nodeIntegration disabled

## 4. Manual Smoke Test

- [x] 4.1 Run `npm start` and verify app launches without errors
- [x] 4.2 Navigate to all routes (Wallet, About, Users) and verify no console errors
- [x] 4.3 Verify wallet info displays correctly (address + balance)
- [x] 4.4 Verify block rendering works
