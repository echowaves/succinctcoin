---
title: 'Configuration ownership split'
type: 'refactor'
created: '2026-09-23'
status: 'done'
review_loop_iteration: 2
followup_review_recommended: false
context: []
warnings: []
deferred:
  - summary: >-
      Pre-existing wallet-panel channel misalignment: Wallet.js:13 sends
      sendSync('/api/wallet-info') (slash) but the baseline sendSync whitelist
      is 'api/wallet-info' (no slash), so the wallet panel is silently dropped
      at runtime. The new preload.test.js whitelist-routing row pins the
      no-slash routing, so an alignment fix must update it.
    evidence: |-
      Verified against dc259e6: src/renderer/preload.js whitelist
      ['api/wallet-info']; src/renderer/components/Wallet.js:13
      electronAPI.sendSync('/api/wallet-info'); src/main/api.js:158
      ipcMain.on('/api/wallet-info'). Carried from pass-2 triage (Blind-2) and
      re-reported by the pass-3 verification-gap layer (Other findings).
    location: >-
      src/renderer/components/Wallet.js:13
    severity: medium
  - summary: >-
      Two renderer fetch targets have no serving route: /api/known-addresses
      (ConductTransaction.js:14, no such route in api.js) and
      /api/mine-transactions (TransactionPool.js:22, registered only in the
      dev-only block, 404 in packaged apps). Only the URL base changed in this
      story.
    evidence: |-
      Full route inventory of src/main/api.js (blocks, blocks/length,
      blocks/:id, mine-transactions [dev-only], transact,
      transaction-pool-map). Carried from pass-2 triage (VG-3/VG-4) and
      re-reported by the pass-3 verification-gap layer.
    location: >-
      src/renderer/components/ConductTransaction.js:14
    severity: medium
  - summary: >-
      OpenSpec spec of record is incomplete: openspec/specs/api-endpoints/
      spec.md documents the /api/wallet-info IPC scenario but has no
      /api/port IPC entry and no getApiPort bridge method; no OpenSpec change
      covers this story.
    evidence: |-
      Pass-3 blind-hunter finding: openspec/specs/api-endpoints/spec.md
      reviewed; latest archive 2026-09-19. This story's intent forbids
      OpenSpec edits; Story 10 (CAP-13) owns OpenSpec reconciliation and
      should add the row there.
    location: >-
      openspec/specs/api-endpoints/spec.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** The renderer reads app config directly — three components (`Blocks.js`, `TransactionPool.js`, `ConductTransaction.js`) import `src/config.js` and hardcode their fetches against `ROOT_NODE_ADDRESS` — so the renderer→app config boundary is open: the port is a renderer-visible constant instead of a bridge-provided value, and nothing prevents a fourth component from reaching across the layer. CAP-10/AD-8 require one owner per config value (chain semantics in `src/main/config.js`, network/app values in `src/config.js`) with the renderer importing no config file directly — it receives the API port via the preload bridge, `window.electronAPI.getApiPort(): number` (synchronous pull).

**Approach:** Expose `getApiPort()` on the existing preload bridge, backed by the app-config `DEFAULT_PORT` (single owner, unchanged) via a synchronous IPC pull on the `'/api/port'` channel; rewire the three renderer components to build their API base from `window.electronAPI.getApiPort()`; add a static boundary test (no renderer file other than the bridge imports `src/config.js`, and no renderer file hardcodes a localhost port), an ownership test (the mining re-check interval is a distinct app-constant from the core `VALIDATION_RATE`), and a cross-file join test (the port channel the bridge sends equals the channel the main process registers).

## Boundaries & Constraints

**Always:**
- `DEFAULT_PORT` stays owned by `src/config.js` (3001 dev / 3333 prod via `electron-is-dev`); the preload exposes it as `getApiPort(): number` (synchronous) — the sole renderer→app config surface (AD-8).
- The renderer builds API base URLs as `http://localhost:${port}` with the port from `window.electronAPI.getApiPort()`; no renderer file other than `preload.js` imports `src/config.js`.
- Config ownership is otherwise unchanged: chain semantics in `src/main/config.js`, network/app values (ports, channels, discv5, relays, mining re-check interval) in `src/config.js`; `MINING_RECHECK_INTERVAL` (app) remains a distinct constant from `VALIDATION_RATE` (core) — same default number is coincidence, not an alias.
- The existing bridge methods and their channel whitelists (`send`, `sendSync`, `receive`) are unchanged; `getApiPort` is additive.
- The main process keeps reading app config directly (`ROOT_NODE_ADDRESS` for root-sync, `DEFAULT_PORT` for `listen`) — only the renderer is constrained.

**Never:**
- No bridge methods beyond `getApiPort`; the port is pull-only (never pushed into the renderer).
- No config value changes: no port change, no interval change, no renames, no value moved between the two config files.
- No renderer→core import changes (the pre-existing `ConductTransaction`→`Account` and `Transaction`→`Crypto` imports are AD-1 headless-core territory, untouched here) and no new dependencies.
- No changes to main-process config reads, the miner, the core, or API endpoints.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| BRIDGE_PROD_PORT | preload loads with `electron` mocked to the isolated-world preload surface (no `app`), `electron-is-dev` → false, mocked `sendSync('/api/port')` → real config `DEFAULT_PORT` | `exposeInMainWorld('electronAPI', api)` where `api.getApiPort()` synchronously returns `3333` (a number) by calling `ipcRenderer.sendSync('/api/port')` directly — the port channel is not part of the `sendSync` whitelist; existing `send`/`sendSync`/`receive` still present and route their whitelisted channels | No error |
| BRIDGE_DEV_PORT | same mocks, `electron-is-dev` → true | `api.getApiPort()` returns `3001` | No error |
| PORT_HANDLER | the `'/api/port'` `ipcMain` handler is invoked with a stub `event` (`electron-is-dev` mocked false) | `event.returnValue` is set to `3333` (the app-config `DEFAULT_PORT`); the handler is registered for exactly the `'/api/port'` channel | No error |
| PORT_CHANNEL_JOIN | static: the channel literal in `preload.js` `getApiPort` and the `ipcMain.on` registrations in `src/main/api.js` | one logical channel: the string the bridge sends is among the channels the main process registers, and that registration's handler answers with the app-config `DEFAULT_PORT` — `'/api/port'` on both surfaces (the human-resolved canonical form, matching the `/api/*` handler-registration precedent) | static assertion failure |
| RENDERER_NO_CONFIG_IMPORT | scan every `.js`/`.jsx` under `src/renderer/` except `*.test.*` (the preload is in scope — it imports nothing) | none imports the `src/config` module via static `from '…'`, bare side-effect `import '…'`, `require('…')`, or dynamic `import('…')` (specifiers resolved against each file's directory) | static assertion failure |
| HARDCODED_API_PORT | scan every non-test renderer source file for a literal `http(s)://localhost:<port>` | none — the only localhost URL builder is `lib/api-base.js`, which interpolates the bridge port; a hardcoded port (e.g. a component reverting to `http://localhost:3333`) fails the scan | static assertion failure |
| INTERVAL_OWNERSHIP | import both config modules | `MINING_RECHECK_INTERVAL` is a number owned only by `src/config.js` and `VALIDATION_RATE` a number owned only by `src/main/config.js` (neither module exports the other's key) | No error |
| API_BASE_FORMAT | `getApiBase()` called with `window.electronAPI.getApiPort()` mocked to return `4242` | returns exactly `` `http://localhost:4242` `` | No error |
| COMPONENTS_USE_BRIDGE | the three rewired components | every fetch base is built from `getApiBase()` (which pulls `window.electronAPI.getApiPort()`); no `globalConfig` import remains in any component (the boundary scan) and no fetch base hardcodes a localhost port (`HARDCODED_API_PORT`) | static assertion failure |

</intent-contract>

## Code Map

- `src/config.js` -- app/network config; owner of `DEFAULT_PORT`, `ROOT_NODE_ADDRESS`, `CHANNELS`, discv5/relay values, `MINING_RECHECK_INTERVAL`. Unchanged — read-only reference. **Never imported by the preload** (see Design Notes: its `electron-is-dev` read crashes the preload's isolated world).
- `src/main/config.js` -- core chain config; owner of `VALIDATION_RATE`, genesis, rewards, stake, store paths. Unchanged — read-only reference.
- `src/renderer/preload.js` -- the `contextBridge` (CJS: `require('electron')`); add `getApiPort: () => ipcRenderer.sendSync('/api/port')` to the exposed `electronAPI` object. **No whitelist addition** — `getApiPort` calls `ipcRenderer.sendSync` directly, so the existing `send`/`sendSync`/`receive` whitelists stay byte-identical. **No config import** — the preload stays fully CJS and pulls the port from the main process synchronously.
- `src/main/api.js` -- add `ipcMain.on('/api/port', (event) => { event.returnValue = globalConfig.DEFAULT_PORT })` next to the existing `/api/wallet-info` handler (line ~159) — same `event.returnValue` pattern; `globalConfig` and `ipcMain` are already imported. This is the only main-process change.
- `src/renderer/components/Blocks.js` -- imports `../../config` (line 5); two fetches against `ROOT_NODE_ADDRESS` (`/api/blocks/:id`, `/api/blocks/length`); rewire to the bridge helper.
- `src/renderer/components/TransactionPool.js` -- same import; two fetches (`/api/transaction-pool-map`, `/api/mine-transactions`); rewire.
- `src/renderer/components/ConductTransaction.js` -- same import; two fetches (`/api/known-addresses`, `/api/transact`); rewire. (Also imports core `Account` — AD-1, out of scope.)
- `src/renderer/lib/api-base.js` -- NEW: tiny lazy helper `getApiBase()` → `` `http://localhost:${window.electronAPI.getApiPort()}` `` (reads the bridge at call time, never at module scope, so renderer modules stay importable outside Electron).
- `src/renderer/lib/api-base.test.js` -- NEW: sets `window.electronAPI = { getApiPort: () => 4242 }`; asserts `getApiBase()` returns exactly `` `http://localhost:4242` `` (pins the URL format at the helper surface).
- `src/renderer/preload.test.js` -- NEW: bridge test; mocks `electron` with the **isolated-world preload surface** (`contextBridge`, `ipcRenderer` — **no `app`**, mirroring what a real sandboxed preload's `require('electron')` exposes, so a future `electron.app` dependency fails here instead of in the packaged app); mocks `electron-is-dev` per row (false → 3333, true → 3001); the mocked `ipcRenderer.sendSync` returns the real `require('../config').default.DEFAULT_PORT` evaluated under that flag for the `'/api/port'` channel, so `getApiPort()` returns the port the main process would send; asserts `getApiPort` is a synchronous number-returning function, that it pulls via `sendSync('/api/port')`, and that the pre-existing methods still route their whitelisted channels (`send('api/blocks')` → `ipcRenderer.send` called; `sendSync('api/wallet-info')` → `ipcRenderer.sendSync` called).
- `src/renderer/config-boundary.test.js` -- NEW: static scan of every `.js`/`.jsx` under `src/renderer/` (excluding only `*.test.js`/`*.test.jsx` — the preload imports nothing, so it is in scope) for a `src/config` import — matches static `from '…'`, **bare side-effect `import '…'`**, `require('…')` (one- and two-arg), **and dynamic `import('…')`** specifiers, resolved against the file's directory; a `HARDCODED_API_PORT` scan failing any non-test renderer file that contains a literal `http(s)://localhost:<port>` (the only allowed localhost URL builder is `lib/api-base.js`'s interpolation); the `PORT_CHANNEL_JOIN` assertion — the channel literal in `preload.js` `getApiPort` equals a registered `ipcMain.on` channel in `src/main/api.js` (static source comparison, consistent with the repo's static boundary style); plus the `INTERVAL_OWNERSHIP` assertion importing both config modules (the file mocks `electron-is-dev` at the top — required: loading `src/config.js` in plain jest throws, since the real `electron-is-dev` package is untransformed ESM under the CJS transform).
- `src/main/api.test.js` -- existing root-sync wiring test; add a `PORT_HANDLER` row: the mocked `ipcMain.on` records the `'/api/port'` registration; invoking that handler with a stub `event` sets `event.returnValue` to `3333` (`electron-is-dev` is already mocked false in this file).
- `src/main/index.js` -- `api.listen(globalConfig.DEFAULT_PORT)` (line ~19); read-only (the port's sanctioned consumer).
- Build wiring (read-only evidence): `package.json` forge plugin-webpack `renderer.entryPoints` lists `preload.js` in the renderer build, so the preload is bundled by `webpack.renderer.config.js`. After the change no renderer module imports `src/config.js` at all — it drops out of the renderer bundle; the preload never loads it.

## Tasks & Acceptance

**Execution:**
- `src/renderer/preload.js` -- add `getApiPort: () => ipcRenderer.sendSync('/api/port')` to the exposed API; **no whitelist addition** (direct `ipcRenderer.sendSync` call, whitelists untouched) and **no config import** -- the bridge becomes the sole renderer→app config surface (AD-8) without loading app config into the preload's isolated world.
- `src/main/api.js` -- add the `ipcMain.on('/api/port', …)` handler setting `event.returnValue = globalConfig.DEFAULT_PORT` next to `/api/wallet-info` -- the main process answers the synchronous port pull (the only sanctioned cross-boundary config read).
- `src/renderer/lib/api-base.js` -- NEW lazy `getApiBase()` helper -- one URL-construction site for the three components; lazy read keeps renderer modules importable without `window.electronAPI`.
- `src/renderer/components/Blocks.js`, `src/renderer/components/TransactionPool.js`, `src/renderer/components/ConductTransaction.js` -- delete the `../../config` import; build every fetch base via `getApiBase()` -- the renderer reads no config across the layer.
- `src/renderer/preload.test.js` -- NEW: bridge rows `BRIDGE_PROD_PORT`, `BRIDGE_DEV_PORT` (isolated-world electron mock, no `app`), plus the whitelist-routing rows for the pre-existing methods.
- `src/renderer/config-boundary.test.js` -- NEW: rows `RENDERER_NO_CONFIG_IMPORT`, `HARDCODED_API_PORT`, `PORT_CHANNEL_JOIN`, `INTERVAL_OWNERSHIP` (mocks `electron-is-dev` at the top).
- `src/renderer/lib/api-base.test.js` -- NEW: row `API_BASE_FORMAT`.
- `src/main/api.test.js` -- add the `PORT_HANDLER` row to the existing wiring test.

**Acceptance Criteria:**
- Given the app (dev or packaged), when the renderer needs the API port, then it obtains it synchronously via `window.electronAPI.getApiPort()` and no renderer module other than the preload imports `src/config.js`.
- Given the static boundary test, when a future renderer file imports `src/config.js` (in any of the `from`/side-effect `import`/`require`/`import()` forms), then the test fails.
- Given the static boundary test, when a renderer file hardcodes a `localhost:<port>` API base, then the test fails.
- Given the join test, when the channel string the bridge sends diverges from the channel the main process registers, then the test fails.

## Spec Change Log

- 2026-09-23 (review pass 1, bad_spec): Triggering finding — the preload-imports-config mechanism makes the real preload throw at load: `src/config.js` → `electron-is-dev@3.0.1` reads `electron.app.isPackaged` at module scope, and the preload's isolated world has no `app` on `require('electron')`, so `exposeInMainWorld` never runs and `window.electronAPI` is undefined for the entire renderer (verified empirically against the built bundle by the verification-gap layer). Amended (outside `<intent-contract>`): the delivery mechanism is now a **synchronous IPC pull** — `getApiPort: () => ipcRenderer.sendSync('api-port')` + `'api-port'` added to the `sendSync` whitelist in `preload.js`, and a new `ipcMain.on('/api/port', …)` handler in `api.js` setting `event.returnValue = globalConfig.DEFAULT_PORT` (the same pattern as the existing `/api/wallet-info`). Known-bad state avoided: the first implementation's green suite masking a fully broken renderer. KEEP instructions that survive re-derivation: the lazy `lib/api-base.js` helper with its call-time bridge read; the three-component rewiring to `getApiBase()`; the resolution-based boundary scan (now extended to dynamic `import('…')` and scanning the preload too); the `INTERVAL_OWNERSHIP` assertion; the isolated-world electron mock in the bridge test (no `app`); the `API_BASE_FORMAT` and `PORT_HANDLER` rows; the `electron-is-dev` mock at the top of `config-boundary.test.js`. Also folded in first-pass low findings: bridge test now exercises the whitelist routing; `api-base.test.js` covers the helper; the boundary matcher catches `import()`/side-effect imports. The intent-contract is unchanged — the contract clauses (synchronous pull, `getApiPort(): number`, single owner, pull-only) hold under the IPC mechanism.

- 2026-09-25 (human intent-gap resolution, pass 2): The pass-2 review halted on an `intent_gap` — the matrix pinned two *different* channel literals (`BRIDGE_*` rows: `sendSync('api-port')` no slash; `PORT_HANDLER`: "exactly the `'/api/port'` channel"), and nothing stated the bridge string must equal the handler string, so the re-derivation shipped a desynced pair (`getApiPort()` → `undefined` → `http://localhost:undefined`) that no per-surface test could see. **Human decision: `'/api/port'` is the canonical channel on both surfaces** (matching the `/api/wallet-info`, `/api/blocks` handler-registration precedent), and a **join test** must assert the bridge-sent string equals the handler-registered string. Amended the `<intent-contract>` (the human's resolution is the authority to open it): `BRIDGE_PROD_PORT` now fixes `sendSync('/api/port')` and states the port channel is *not* part of the `sendSync` whitelist (the pass-1 Code Map's whitelist addition violated the intent's own "whitelists unchanged" clause — `getApiPort` calls `ipcRenderer.sendSync` directly); new `PORT_CHANNEL_JOIN` and `HARDCODED_API_PORT` rows; `RENDERER_NO_CONFIG_IMPORT` extended to `.jsx` files and the bare side-effect `import '…'` / two-arg `require` forms (the scanner gaps pass-2 logged as moot). Folded in the pass-2 findings that were mooted by the cascade: `HARDCODED_API_PORT` closes the "hardcoded port passes the whole suite" gap (Blind-16/VG-1) and replaces `COMPONENTS_USE_BRIDGE` as a manual check; the scanner extensions close VG-2/Blind-6/Blind-7. Mooted pre-existing findings (wallet-info whitelist mismatch, `/api/known-addresses` and `/api/mine-transactions` 404s) remain out of scope and route to defer. Status `blocked` → `ready-for-dev`; `review_loop_iteration` 1 → 2 (this pass is the post-resolution re-derivation, not a bad_spec loopback).

## Review Triage Log

### 2026-09-23 — Review pass 1

- verdicts: 16 findings — high 2, medium 0, low 10, false 4, maybe-false 0
- findings:
  - `[low]` `[reject]` Blind-1: `src/renderer/lib/api-base.js` is "absent from the diff" — refuted: the file exists in the working tree; the staging command's `git diff --no-index` did not recurse into the new `lib/` *directory* (it emitted the directory name, not its files). A diff-staging artifact, not a code defect.
  - `[low]` `[bad_spec]` Blind-2: no test covers `api-base.js` itself (the central new helper) — folded into the pass-1 amendment (new `API_BASE_FORMAT` row in `lib/api-base.test.js`).
  - `[low]` `[bad_spec]` Blind-3: nothing verifies the components actually use the bridge (a hardcoded `http://localhost:3333` would pass) — folded into the pass-1 amendment (`API_BASE_FORMAT` automates the helper surface; `COMPONENTS_USE_BRIDGE` stays a manual check per the intent).
  - `[low]` `[reject]` Blind-4: `getApiBase()` throws a `TypeError` if `window.electronAPI` is undefined — the guard guards a state the app cannot reach (the preload always runs before the renderer; a plain-browser render of these components is not a supported surface). Adding a branch for an unreachable case is more than a direct correction; rejected low.
  - `[low]` `[bad_spec]` Blind-5: `preload.js` becomes an ESM/CJS hybrid (new ESM `import` beside the CJS `require('electron')`) — eliminated by the pass-1 amendment: the IPC mechanism means the preload imports *nothing*, staying fully CJS.
  - `[low]` `[bad_spec]` Blind-6: the boundary scanner misses side-effect and dynamic `import('…')` forms — folded into the pass-1 amendment (matcher extended to `import('…')`).
  - `[low]` `[bad_spec]` Blind-7: the bridge test never invokes the pre-existing methods, so a broken channel whitelist would go undetected — folded into the pass-1 amendment (whitelist-routing assertions added).
  - `[false]` `[reject]` Edge-1: `INTERVAL_OWNERSHIP` would crash loading the real `electron-is-dev` without a mock — refuted: `config-boundary.test.js` mocks `electron-is-dev` at the top (line 4), and the suite is green (197/197). The file was written per the amended spec's Code Map. (The *spec's first* version lacked that mock — the amendment now records it.)
  - `[low]` `[bad_spec]` Edge-2: a future `await import('../../config')` bypasses the boundary guard — same root cause as Blind-6; folded into the pass-1 amendment (dynamic-`import` matcher).
  - `[low]` `[reject]` Edge-3: `window.electronAPI` undefined → `getApiBase()` `TypeError` — same root cause as Blind-4 (unreachable in the app); rejected low.
  - `[high]` `[bad_spec]` Edge-4: `electron-is-dev` now evaluates in the preload's isolated world; if the preload's `require('electron')` lacks `app`, the module throws and the whole bridge fails — VERIFIED: the isolated-world preload surface has no `app` (`electron-is-dev@3.0.1` reads `electron.app.isPackaged` at module scope). This is the trigger for the pass-1 spec amendment (IPC-pull mechanism).
  - `[high]` `[bad_spec]` VG-1: regression — the real built preload fails to load (`TypeError: Cannot read properties of undefined (reading 'isPackaged')`), so `window.electronAPI` is never defined and the entire renderer (wallet panel + all data pages) is broken; the new bridge test mocks `electron-is-dev` and cannot see the throw. Verified empirically against the built bundle (live `isPackaged` read ships in `.webpack/renderer/main_window/preload.js`; nothing sets `ELECTRON_IS_DEV`). Same root cause as Edge-4 — grouped. Amendment applied; code reverted and re-derived on the IPC mechanism.
  - `[low]` `[bad_spec]` IA-1: divergence 1 — the component-surface expectation ("every fetch base is built from `window.electronAPI.getApiPort()`") lives in the helper, not the components, under the helper-mediated reading — folded into the pass-1 amendment (`API_BASE_FORMAT` pins the format at the helper surface; the matrix row stays manual per the intent).
  - `[false]` `[reject]` IA-2: divergence 2 — the diff is "not self-contained; its central dependency is absent" — refuted: same diff-staging artifact as Blind-1; `src/renderer/lib/api-base.js` exists and was reviewed from the working tree.
  - `[low]` `[bad_spec]` IA-3: divergence 3 — the untested surface coincides with the divergent surface (no test renders a component, calls `getApiBase`, or pins the base-URL format) — folded into the pass-1 amendment (`API_BASE_FORMAT` row).
  - `[false]` `[reject]` IA-4: divergence 4 — minor non-divergent deltas (resolution-based matcher is a superset of the two named specifiers; `typeof`-only legacy-method checks; lazy pull timing; the spec file as a process artifact) — none is a defect; all are consistent with the intent or deliberate spec choices. No action.

### 2026-09-23 — Review pass 2 (re-derivation on the IPC mechanism)

- verdicts: 28 findings — high 5, medium 6, low 16, false 1, maybe-false 0
- **Route: `intent_gap` (HALT). The high group is a single root cause that lives inside the `<intent-contract>` and cannot be resolved from the spec — lower entries are moot per the cascade.**
- **Attempted change saved as a patch:** `_bmad-output/implementation-artifacts/spec-configuration-ownership-split-intent-gap.patch` (the full re-derived diff — IPC-pull mechanism, all 9 files). Code changes were reverted to the `dc259e6` baseline; only this spec and the patch file remain.
- findings:
  - `[high]` `[intent_gap]` Blind-1: the end-to-end port channel is never joined — the preload calls `ipcRenderer.sendSync('api-port')` while main registers `ipcMain.on('/api/port', …)`; no test asserts the two strings match, so in the real app `getApiPort()` returns `undefined` and every fetch targets `http://localhost:undefined`. Verified against `src/renderer/preload.js:25` and `src/main/api.js:173`. **Root cause is inside the `<intent-contract>`: the matrix pins two *different* literals — `BRIDGE_PROD_PORT`/`BRIDGE_DEV_PORT` fix the bridge call at `sendSync('api-port')` (no slash), while `PORT_HANDLER` fixes the handler at "exactly the `'/api/port'` channel" (slash) — and no row states the bridge string must equal the handler string.** Two defensible readings, nothing in the intent to select: (A1) the strings are literal per-surface and need not match (which is a broken app), vs (A2) one logical channel, pick one string (the codebase's own `'/api/wallet-info'`-identical-on-both-sides precedent suggests `'/api/port'` on both). This is the unresolved question.
  - `[high]` `[intent_gap]` Blind-13: `getApiPort` hardcodes the channel `'api-port'` independently of the `sendSync` whitelist's copy — same root cause as Blind-1 (two unjoined copies of the channel string); a structural desync. Grouped with Blind-1.
  - `[high]` `[intent_gap]` Edge-1: `preload.js:24` `getApiPort` targets `'api-port'`, which no main handler listens on (main has `'/api/port'`) → `getApiPort()` resolves `undefined`. Same root cause; grouped with Blind-1.
  - `[high]` `[intent_gap]` Edge-3: claim (high confidence) that the acceptance "it obtains it synchronously via `window.electronAPI.getApiPort()`" is unmet because the pull targets a handler-less channel. Same root cause; grouped with Blind-1.
  - `[high]` `[intent_gap]` IA-div-1: the intent's expectations live on two surfaces the diff never joins — the `BRIDGE_*` expectations at the bridge surface and the `PORT_HANDLER` expectation at the `ipcMain` surface, each tested with the *other* side mocked; the channel-string split (`api-port` vs `/api/port`) is inherited verbatim from the intent's own two literals. Same root cause; grouped with Blind-1. **Unresolved question for the human: which channel string is canonical — `'/api/port'` (matching the `/api/*` precedent of `/api/wallet-info`, `/api/blocks`) or `'api-port'` (as the `BRIDGE_*` rows literally write) — and should a join test assert the bridge-sent string equals the handler-registered string?**
  - `[medium]` `[bad_spec]` Blind-2: pre-existing `api/wallet-info` route is misaligned across the boundary — main registers `'/api/wallet-info'` (slash), the *baseline* `sendSync` whitelist is `'api/wallet-info'` (no slash), and `Wallet.js` calls `sendSync('/api/wallet-info')` (slash), which does not match the baseline whitelist, so the wallet panel is silently dropped at baseline. Verified against `git show dc259e6:src/renderer/preload.js` (whitelist `['api/wallet-info']`) and `Wallet.js:13`. Pre-existing (the diff touches this whitelist only by adding `'api-port'`); out of scope for CAP-10. Moot under the intent_gap; would route to defer.
  - `[medium]` `[bad_spec]` Blind-16: nothing verifies the three components actually consume the bridge-derived base — a hardcoded `http://localhost:3333` in any of the six fetch sites passes the whole suite (boundary test sees no config import, helper test mocks the bridge, nothing renders). Moot under the intent_gap; would route to bad_spec (the spec left `COMPONENTS_USE_BRIDGE` a manual check).
  - `[medium]` `[bad_spec]` VG-1: same root cause as Blind-16 — the component fetch bases are observed by no test; reverting `Blocks.js` to a hardcoded prod port ships green and breaks the dev UI (dev listens 3001, UI would fetch 3333). Grouped with Blind-16.
  - `[medium]` `[bad_spec]` VG-2: the boundary scanner misses the *bare side-effect* `import '…'` form (the three `SPECIFIER_PATTERNS` match `from '…'`, `require('…')`, `import('…')` but not `import '../../config'`), so the exact failure mode the pass-1 amendment recorded (a config import in the preload crashing the bridge) could be reintroduced with the suite green. Verified against `config-boundary.test.js:18-22`. Moot under the intent_gap; would route to bad_spec.
  - `[medium]` `[defer]` VG-3: `ConductTransaction.js` fetches `/api/known-addresses`, which no route in `src/main/api.js` serves (verified: the file's routes are blocks, blocks/length, blocks/:id, mine-transactions, transact, transaction-pool-map) → 404. Pre-existing (the diff only changed the URL base); out of scope. Moot under the intent_gap.
  - `[medium]` `[defer]` VG-4: `TransactionPool.js` fetches `/api/mine-transactions`, registered only inside `if (isDev)` in `api.js` → 404 in a packaged app. Pre-existing; out of scope. Moot under the intent_gap.
  - `[low]` `[reject]` Blind-3: `getApiPort()` is a blocking synchronous IPC on every fetch (TransactionPool polls every 10 s) for a value that never changes — caching would remove the repeated main-thread stall. Low (a performance optimization, not a correctness defect; the port is immutable at runtime); rejected as not worth the added state.
  - `[low]` `[reject]` Blind-4: `api-base.js` throws a bare `TypeError` if `window.electronAPI` is undefined (renderer loaded without the preload). Guards an unreachable state in the app (the preload always runs first); rejected low.
  - `[low]` `[reject]` Edge-2: same root cause as Blind-4 (`window.electronAPI` undefined → `TypeError`); rejected low.
  - `[low]` `[reject]` Blind-5: `api-base.test.js` assigns `global.window` at module scope with no restore, leaking the global across the jest run. Low test hygiene; the suite is green and the helper's call-time read is pinned. Rejected low.
  - `[low]` `[bad_spec]` Blind-6: the boundary gate scans only `.js` (not `.jsx`/`.mjs`/`.cjs`), though the eslint config targets `**/*.jsx`. Moot under the intent_gap; would route to bad_spec.
  - `[low]` `[bad_spec]` Blind-7: the gate's `require`/`import()` regexes under-match real forms (two-arg `require`, destructured `require`). Moot under the intent_gap; would route to bad_spec.
  - `[low]` `[bad_spec]` Blind-8: `resolvesToAppConfig` resolves only relative specifiers (not `~`/alias/absolute). Moot under the intent_gap; would route to bad_spec.
  - `[low]` `[reject]` Blind-9: `api.test.js` hardcodes the literal `3333` in the `PORT_HANDLER` row rather than asserting against `globalConfig.DEFAULT_PORT`. Low test hygiene; rejected low.
  - `[low]` `[reject]` Blind-10: the `PORT_HANDLER` row is nested inside the `api.syncWithRootState (AD-5/AD-13 root-sync wiring)` describe block. Cosmetic; rejected low.
  - `[low]` `[reject]` Blind-11: `preload.test.js` re-hardcodes the `3333`/`3001` port values that live in `src/config.js` instead of asserting `port === DEFAULT_PORT`. Low; rejected low.
  - `[low]` `[reject]` Blind-12: `config-boundary.test.js` imports `src/main/config` (which mkdirs `~/.succinctcoin`/`.test` at module scope) relying on jest's `JEST_WORKER_ID` without documenting it. Low; the convention is established repo-wide. Rejected low.
  - `[low]` `[reject]` Blind-14: `api-base.test.js` is a single happy path (no absent-`window` or non-number-`getApiPort` case). Low; rejected low.
  - `[low]` `[reject]` Blind-15: the boundary test's exclusion is test-file-only with no escape hatch for an intentional future exception. Low; rejected low.
  - `[low]` `[bad_spec]` Edge-4: the diff adds `'api-port'` to the `sendSync` whitelist — an entry no code path uses, and a change to an existing bridge method's whitelist that the intent's "whitelists … are unchanged" clause forbids (`getApiPort` calls `ipcRenderer.sendSync` directly and needs no whitelist entry). Moot under the intent_gap; would route to bad_spec (my pass-1 Code Map directed the addition).
  - `[low]` `[bad_spec]` IA-div-2: the diff modifies the `sendSync` whitelist (`['api/wallet-info', 'api-port']`) in tension with the "whitelists unchanged / getApiPort is the sole surface" reading (D1 vs D2). Same root cause as Edge-4; moot under the intent_gap.
  - `[low]` `[reject]` IA-div-4: `receive` routing is untested and the `PORT_HANDLER` "exactly" is exercised as containment, not exclusivity. Low; the intent's matrix does not require those rows. Rejected low.
  - `[false]` `[reject]` IA-div-3: the intent's `RENDERER_NO_CONFIG_IMPORT` parenthetical "(the preload is in scope — it no longer imports config)" presupposes a preload config import that never existed at baseline `dc259e6` (verified: the baseline `preload.js` only `require('electron')`). The inaccuracy is in the intent's narrative, not a code defect; the operative constraint (the preload is scanned and must be clean) holds. Not a defect.

### 2026-09-25 — Review pass 3 (post-resolution re-derivation, channel `'/api/port'` both surfaces)

- verdicts: 21 findings — high 0, medium 6, low 13, false 2, maybe-false 0
- **Route: patch (4 groups) + defer (3); no intent_gap, no bad_spec. Patches applied directly (subagents are stateless — no re-engagement possible); re-verified 212/212, lint 60 baseline.**
- findings:
  - `[medium]` `[patch]` B-9 (Blind): the retired `COMPONENTS_USE_BRIDGE` check is not replaced for the relative-URL vector — both new scans miss a component reverting to a bare relative `fetch('/api/blocks/length')` (no config import, no `localhost:<port>` literal). Grouped with VG-1 and D2 (same root cause: the positive clause "every fetch base is built from `getApiBase()`" is verified by no test). Patched: new positive static assertion `COMPONENTS_USE_BRIDGE` in `config-boundary.test.js` — every fetch base in the three components must start with `${getApiBase()}/api/`.
  - `[medium]` `[patch]` B-5 (Blind): the boundary scanner is never self-tested — a regex/resolution typo makes `RENDERER_NO_CONFIG_IMPORT` pass vacuously, silently killing the story's central guard. Patched: new `boundary scanner self-test` describe in `config-boundary.test.js` — `it.each` over the five import forms (static from / bare side-effect / require 1-arg / require 2-arg / dynamic import) asserting each pattern family catches `../../config`, plus resolution mapping assertions (`../../config` from components → true; `../config` from renderer root → true; `../../main/config`, `react` → false).
  - `[medium]` `[patch]` VG-1 (verification gap, pre-verified): a component fetch base written as `http://localhost:${3333}`-via-non-literal or a bare relative URL ships green — no test executes a component fetch against the bridge; demonstration: revert `Blocks.js:14` to a hardcoded port. Partially refuted as filed — a *literal* `http://localhost:3333` IS caught by `HARDCODED_API_PORT` — but the surviving vectors (non-literal port, relative URL) are real. The filed disposition suggested an RTL render test: infeasible here — `testEnvironment: node`, `jest-environment-jsdom` not installed, and the intent forbids new dependencies. Grouped with B-9 and D2; patched as the static positive assertion (same group).
  - `[medium]` `[defer]` VG-other-1 (verification gap, Other findings; carried pass-2 Blind-2): pre-existing wallet-panel channel misalignment — `Wallet.js:13` sends `sendSync('/api/wallet-info')` (slash) but the baseline `sendSync` whitelist is `'api/wallet-info'` (no slash) → the wallet panel is silently dropped at runtime. The new `preload.test.js` whitelist-routing row now pins the no-slash routing, so a future alignment fix must update it. Pre-existing (the diff leaves the whitelist byte-identical by design); deferred (now in frontmatter `deferred`).
  - `[medium]` `[defer]` VG-other-2 (verification gap, Other findings; carried pass-2 VG-3+VG-4): two rewired fetch targets have no serving route — `/api/known-addresses` (`ConductTransaction.js:14`, no such route) and `/api/mine-transactions` (`TransactionPool.js:22`, dev-only → 404 packaged). Pre-existing; only the URL base changed. Deferred (now in frontmatter `deferred`).
  - `[medium]` `[patch]` D2 (intent-alignment): `COMPONENTS_USE_BRIDGE` clause (a) — "every fetch base is built from `getApiBase()`" — is verified by code, not by any test; the tests exercise only the two negative surfaces. Same root cause as B-9/VG-1; grouped, patched with the same assertion.
  - `[low]` `[patch]` B-3 (Blind): nothing pins that `'/api/port'` is NOT in the `sendSync` whitelist (an intent clause stated twice) — a future whitelist addition (a second renderer→config surface) would pass the suite. Patched: the negative routing test now includes `api.sendSync('/api/port')` asserting `undefined` return and no `ipcRenderer.sendSync` call.
  - `[low]` `[patch]` D1 (intent-alignment): `BRIDGE_DEV_PORT`'s input state ("same mocks, `electron-is-dev` → true" with the real config re-evaluated) is not wired — the test hardcoded `mockReturnValue(3001)`. The observable contract held, but the mechanism the row names was unexercised. Patched: `preload.test.js` restructured to `loadBridge(isDev)` — fresh module registry per row, `electron-is-dev` mocked per flag, `sendSync` relaying the real config's `DEFAULT_PORT` evaluated under that flag; both rows now assert `DEFAULT_PORT` (3333/3001) and the returned port.
  - `[low]` `[defer]` B-1 (Blind): the new `/api/port` IPC endpoint and `getApiPort` bridge method are absent from `openspec/specs/api-endpoints/spec.md` (which documents the `/api/wallet-info` IPC scenario) — the spec of record is silently incomplete. This story's intent forbids OpenSpec edits (Story 10, CAP-13, owns OpenSpec reconciliation); deferred (now in frontmatter `deferred`).
  - `[low]` `[reject]` B-2 (Blind): the join test doesn't prove the joined pair "answers with the right value" — the handler-answer half lives in `PORT_HANDLER`. Both ends are pinned to the same source of truth (`globalConfig.DEFAULT_PORT` in `api.test.js`, the real config's `DEFAULT_PORT` in `preload.test.js`); a value desync fails one of the two existing rows. Split coverage is the spec's design (join = channel identity, static; handler = runtime). Not a defect.
  - `[low]` `[reject]` B-4 (Blind): the value-flow seam (handler writes → bridge reads) has no combined end-to-end test — same "per-surface tests" shape as the pass-2 channel seam. Unlike the channel (a string pair that could desync independently), the value flows from a single owner (`src/config.js DEFAULT_PORT`) both tests already pin; no independent desync vector exists. Rejected low.
  - `[low]` `[reject]` B-6 (Blind): `HARDCODED_API_PORT` misses `http://127.0.0.1:<port>` and schemeless `localhost:<port>` forms. The intent pins the guarantee at "literal `http(s)://localhost:<port>`" — 127.0.0.1 is a different host the intent never names, and the false-positive risk of a broader scan (any non-API localhost URL) argues against widening. The intent, not the spec, drew the line; widening is a future intent change, not a correction. Rejected low.
  - `[low]` `[reject]` B-7 (Blind): the scanner resolves only relative specifiers — a future webpack alias (`~/config`) or absolute path bypasses the gate. Verified: no webpack alias is configured in `webpack.renderer.config.js` (grep `alias` → none), and the intent names the relative-import failure mode specifically. A guard against a non-existent alias is complexity for an unreachable state (same class as the rejected unreachable-`window` guards). Rejected low.
  - `[low]` `[reject]` B-8 (Blind): `src/renderer/index.html` is outside both boundary scans. The intent scopes the boundary to renderer *source files* (`.js`/`.jsx`); the entry HTML is webpack boilerplate with no script src (verified: no `src=`/`http` in the file) and no config-import vector. Widening the scan to HTML is beyond the intent's named surface. Rejected low.
  - `[low]` `[reject]` B-10 (Blind): `PORT_CHANNEL_JOIN`'s preload regex could be satisfied by a comment quoting `getApiPort` + an old channel literal before the real method. The current file has exactly one `getApiPort` and one `sendSync` in it; the failure requires a future edit that adds a misleading comment AND changes the channel — and the changed channel would then fail the join test's other half (not registered in `api.js`) unless the comment also matches `api.js`. Rejected low.
  - `[low]` `[reject]` B-11 (Blind): the module-scope `ipcMain.on.mock.calls.find(...)` capture in `api.test.js` fails opaquely if the handler moves off import-time registration. The row already carries `expect(portRegistration).toBeDefined()` (a guard with a clear failure point at the capture line); the "point at the registration site" ask is message cosmetics. Rejected low.
  - `[low]` `[reject]` E-1 (edge; carried pass-2 Blind-4): `getApiBase()` throws a bare `TypeError` if `window.electronAPI` is undefined. Unreachable in the app (the preload always runs before the renderer); a guard branch for an unreachable state is more than a direct correction. Rejected low (carried).
  - `[low]` `[reject]` E-2 (edge): `getApiPort()` returning a non-numeric port would produce `http://localhost:undefined`. The only producer of the value is the `'/api/port'` handler writing `globalConfig.DEFAULT_PORT` (a number, pinned by `PORT_HANDLER`); there is no path that yields a non-number. A `Number.isInteger` guard guards a state no caller can produce. Rejected low.
  - `[low]` `[reject]` D3 (intent-alignment): the join row bundles channel identity + handler answer, and no single test verifies both in one place. Descriptive, not a defect: the aggregate covers both clauses (join test + `PORT_HANDLER`), and the split is the spec's deliberate surface assignment (static cross-file vs runtime). No action.
  - `[false]` `[reject]` D4 (intent-alignment): "two intra-intent tensions, both resolved toward the matrix" — the auditor's own conclusion is that both resolutions are defensible and the diff implements the stricter (matrix) reading consistently; no divergence between intent and diff. Not a defect.
  - `[false]` `[reject]` D5 (intent-alignment): `INTERVAL_OWNERSHIP` placement in a renderer-tree test file is the only placement consistent with the row's "import both config modules" input; the auditor states "no divergence". Not a defect.

## Design Notes

**Why the port crosses via synchronous IPC, not a config import into the preload.** The first (reverted) mechanism had the preload `import` `src/config.js`. That is fatal: `src/config.js` evaluates `electron-is-dev` at module scope, and `electron-is-dev@3.0.1` reads `electron.app.isPackaged` when `ELECTRON_IS_DEV` is unset. In the preload's isolated world `require('electron')` exposes only `[contextBridge, crashReporter, ipcRenderer, nativeImage, sharedTexture, webFrame, webUtils]` — **no `app`** — so the preload throws at load, `exposeInMainWorld` never runs, and `window.electronAPI` is undefined for the *entire* renderer (verified empirically against the built bundle: the live `isPackaged` read ships in `.webpack/renderer/main_window/preload.js`, and nothing sets `ELECTRON_IS_DEV`). The renderer bundle tolerated the import because it runs with full `process`/module access; the preload does not.

The IPC pull matches the existing sanctioned pattern exactly — the renderer already pulls `/api/wallet-info` via `ipcRenderer.sendSync` and `api.js` answers with `event.returnValue`. `getApiPort: () => ipcRenderer.sendSync('/api/port')` is synchronous (AD-8's "synchronous pull"), pull-only (never pushed into the renderer), and keeps `DEFAULT_PORT` owned by `src/config.js` in the main process — the preload carries zero config state. The channel is `'/api/port'` on **both** surfaces: the human-resolved canonical form (2026-09-25, intent-gap resolution) following the codebase's own precedent — the existing handlers register with slashed channels (`/api/wallet-info`, `/api/blocks`) and the renderer sends the identical string. The `PORT_CHANNEL_JOIN` test is the control that should have caught the pass-2 split (bridge sent `api-port`, main registered `/api/port` — a `getApiPort()` returning `undefined` that no per-surface test could see): it statically asserts the literal in `preload.js` `getApiPort` equals a channel registered in `src/main/api.js`.

The port stays `localhost`-scoped: the API is the local node's own express server (`src/main/index.js` `listen(DEFAULT_PORT)`), so the renderer never needs a host — only the port, which is exactly what the bridge surface carries.

The pre-existing renderer→core imports (`ConductTransaction`→`Account`, `Transaction`→`Crypto`) violate AD-1 (headless core), not CAP-10, and do not affect the static boundary signal (they import `src/main/...`, not `src/config`); they are deliberately untouched and belong to the AD-1 story.

The boundary scan matches static `from '…'`, bare side-effect `import '…'`, `require('…')` (one- and two-arg), and dynamic `import('…')` specifiers resolved against each file's directory, over `.js` and `.jsx` files, and scans the preload too (it imports nothing — strictly stronger than the matrix row). A second scan (`HARDCODED_API_PORT`) fails any non-test renderer file containing a literal `http(s)://localhost:<port>`: without it, a component could revert to a hardcoded prod port and pass the whole suite (the boundary test sees no config import and the helper test mocks the bridge). Loading `src/config.js` under jest requires mocking `electron-is-dev` (the real package is untransformed ESM under the CJS transform), so `config-boundary.test.js` mocks it at the top, as the main-process tests do.

## Verification

**Commands:**
- `npx jest src/renderer/preload.test.js src/renderer/config-boundary.test.js src/renderer/lib/api-base.test.js src/main/api.test.js --ci` -- expected: all bridge/boundary/ownership/helper/handler/join/hardcoded-port rows pass.
- `npm test` -- expected: full suite green (no existing test imports the renderer).
- `npm run lint` -- expected: no new findings in touched files (baseline 60 problems).

**Manual checks:**
- `grep -rn "config" src/renderer/components` -- expected: no `src/config` import in any component; fetch bases reference `getApiBase()`.
- `src/renderer/preload.js` exposes exactly the prior methods plus `getApiPort`; the `send`/`sendSync`/`receive` whitelists are unchanged; the preload imports no config module.
- `src/main/api.js` registers exactly one new `ipcMain.on` channel: `'/api/port'`.
- The literal `'/api/port'` appears in both `src/renderer/preload.js` (`getApiPort`) and `src/main/api.js` (`ipcMain.on`) -- the same string on both surfaces.

## Auto Run Result

**Implemented change.** CAP-10/AD-8 configuration ownership split: the renderer no longer imports app config. The API port crosses the boundary as a synchronous IPC pull — `window.electronAPI.getApiPort()` (preload) → `ipcRenderer.sendSync('/api/port')` → `ipcMain.on('/api/port')` in the main process answering `event.returnValue = globalConfig.DEFAULT_PORT` (owner unchanged: `src/config.js`). The three data components build every fetch base from the new lazy helper `lib/api-base.js` (`http://localhost:${window.electronAPI.getApiPort()}`). Static boundary tests guard the layer: no non-test renderer file imports `src/config.js` (four import forms, `.js`/`.jsx`, resolution-based), no non-test renderer file hardcodes a `localhost:<port>` literal, the port channel literal is joined across both surfaces (`PORT_CHANNEL_JOIN` — the control that would have caught the pass-2 desync), the scanner self-tests against known-bad fixtures, `MINING_RECHECK_INTERVAL`/`VALIDATION_RATE` remain single-owned, and the positive `COMPONENTS_USE_BRIDGE` assertion pins every component fetch base to `getApiBase()`.

The channel string `'/api/port'` on both surfaces is the human's 2026-09-25 intent-gap resolution (pass-2 halt); the `sendSync` whitelist is unchanged (the port channel is deliberately not part of it — `getApiPort` calls `ipcRenderer.sendSync` directly, which the negative routing test now pins).

**Files changed** (vs `dc259e6`):
- `src/main/api.js` — new `ipcMain.on('/api/port')` handler answering the synchronous port pull with the app-config `DEFAULT_PORT`.
- `src/main/api.test.js` — `PORT_HANDLER` row (module-scope registration capture; stub-event invocation asserts `returnValue` === `DEFAULT_PORT`).
- `src/renderer/preload.js` — additive `getApiPort: () => ipcRenderer.sendSync('/api/port')`; whitelists byte-identical; no new imports.
- `src/renderer/lib/api-base.js` — NEW lazy `getApiBase()` helper (call-time bridge read).
- `src/renderer/lib/api-base.test.js` — NEW `API_BASE_FORMAT` row (4242 → `http://localhost:4242`).
- `src/renderer/components/Blocks.js`, `src/renderer/components/TransactionPool.js`, `src/renderer/components/ConductTransaction.js` — config import replaced by `getApiBase`; all six fetch bases rewired.
- `src/renderer/preload.test.js` — NEW bridge rows (`BRIDGE_PROD_PORT`/`BRIDGE_DEV_PORT` via `loadBridge(isDev)` against the real config, isolated-world electron mock with no `app`) + whitelist-routing rows including the negative for the port channel.
- `src/renderer/config-boundary.test.js` — NEW `RENDERER_NO_CONFIG_IMPORT`, `HARDCODED_API_PORT`, `PORT_CHANNEL_JOIN`, `COMPONENTS_USE_BRIDGE` (positive), `INTERVAL_OWNERSHIP` + scanner self-test.

**Review findings (pass 3, post-resolution):** 21 findings — 4 patch groups applied (positive `COMPONENTS_USE_BRIDGE` assertion; scanner self-test; port-channel negative whitelist row; `loadBridge(isDev)` restructure of the bridge test), 3 deferred (wallet-info slash mismatch [medium, pre-existing]; `/api/known-addresses` + `/api/mine-transactions` 404s [medium, pre-existing]; OpenSpec `/api/port` row [low, owned by Story 10]), 12 rejected (recorded with reasons in the pass-3 triage entry). Patches by verdict: medium 3 (grouped entries), low 2; no high. Follow-up review recommendation: **false** (follow-up pass; no high-severity patch — the work has converged).

**Verification performed:**
- Focused: `npx jest src/renderer/preload.test.js src/renderer/config-boundary.test.js src/renderer/lib/api-base.test.js src/main/api.test.js --ci` → 20/20 tests pass (bridge, boundary, join, hardcoded-port, positive-component, scanner self-test, ownership, helper, handler rows).
- Full: `npm test` → 212/212 tests pass (baseline at `dc259e6`: 193; +19 new rows across 3 new suites + 1 new row in `api.test.js`). The suite was additionally run 14 consecutive times (6 with `--randomize`) with no failures after the pass-3 patches.
- `npm run lint` → 60 problems (36 err / 24 warn) — exactly the pre-existing baseline; no new findings in touched files.
- Manual: `grep -rn "globalConfig\|ROOT_NODE_ADDRESS" src/renderer` → no hits in components; `grep -rn "http://localhost" src/renderer --include='*.js'` → only the `api-base.js` interpolation (no digit after the colon) and the 4242 assertion in its test; `preload.js` imports only `electron`; exactly one new `ipcMain.on` channel; `'/api/port'` literal present on both surfaces.

**Residual risks:** (1) the pre-existing wallet-panel whitelist mismatch (deferred) means the wallet panel is broken at baseline independently of this story; (2) `/api/known-addresses` and `/api/mine-transactions` remain unrouted in packaged apps (deferred); (3) the static boundary guards are source-text scans — a future renderer written in a language/format outside `.js`/`.jsx` would need the scan extended; (4) a one-off intermittent full-suite failure was observed once during verification (205/206, single run) and did not reproduce across 14 subsequent runs including randomized order — identity uncaptured; monitor if it reappears.
