# Review: Versions / Web Verification — ARCHITECTURE-SPINE.md

- **Reviewer lens:** version / web-verification
- **Date:** 2026-09-20
- **Spine reviewed:** `ARCHITECTURE-SPINE.md` (created 2026-09-19)
- **Verdict:** **PASS-WITH-FINDINGS**

All 15 rows of the Stack table match the pinned `package.json` dependencies and the
installed `node_modules` exactly. All code-behavior fact claims check out in source.
No stale or wrong claims found; findings are minor context notes, not spine errors.

## Evidence base (commands run from workspace root)

```text
node -v
  → v24.14.0

node -p "require('@noble/secp256k1/package.json').version"
  → 3.1.0

# versions read from node_modules/<pkg>/package.json:
  libp2p 3.3.2 | @libp2p/gossipsub 15.0.15 | @chainsafe/discv5 12.0.1
  express 5.2.1 | electron 42.3.0 | @libp2p/circuit-relay-v2 4.2.5
  big.js 7.0.1 | dayjs 1.11.13 | jest 30.4.2 | react 19.0.0 | react-dom 19.0.0
  react-bootstrap 2.10.9 | react-router-dom 7.16.0
  @electron-forge/cli 7.11.2 | @electron-forge/plugin-webpack 7.11.2

npm ls @noble/secp256k1
  → succinctcoin@0.0.1 └─┬ @chainsafe/discv5@12.0.1 └── @noble/secp256k1@3.1.0
  (confirms "transitive" label: only dependent is discv5; not a direct dependency)

# shared-interface versions resolving across the P2P stack:
  @libp2p/interface 3.2.2 | @libp2p/interface-internal 3.1.5
  @libp2p/peer-id 6.0.9 | @libp2p/crypto 5.1.18 | @multiformats/multiaddr 13.0.3

# Web check (https://www.electronjs.org/, fetched 2026-09-20):
  latest stable Electron = 44.4.3 (Chromium 152.0.7977.130)
```

## Claim verification table

### 1. Stack table vs package.json

| Claim | Evidence | Status |
| --- | --- | --- |
| Node.js runtime 24.14.0 | `node -v` → `v24.14.0` | verified |
| Electron 42.3.0 | `package.json` devDependencies `"electron": "42.3.0"`; `node_modules/electron` 42.3.0 | verified |
| @electron-forge/cli + plugin-webpack 7.11.2 | `package.json` devDependencies, both `"7.11.2"`; node_modules match | verified |
| React / react-dom 19.0.0 | `package.json` dependencies, both `"19.0.0"` | verified |
| react-bootstrap 2.10.9 | `package.json` dependencies `"2.10.9"` | verified |
| react-router-dom 7.16.0 | `package.json` dependencies `"7.16.0"` | verified |
| Express 5.2.1 | `package.json` dependencies `"5.2.1"`; node_modules 5.2.1, engines `{"node": ">= 18"}` | verified |
| libp2p 3.3.2 | `package.json` dependencies `"3.3.2"`; node_modules match | verified |
| @libp2p/gossipsub 15.0.15 | `package.json` dependencies `"15.0.15"`; node_modules match | verified |
| @chainsafe/discv5 12.0.1 | `package.json` dependencies `"12.0.1"`; node_modules match | verified |
| @libp2p/circuit-relay-v2 4.2.5 | `package.json` dependencies `"4.2.5"`; node_modules match | verified |
| @noble/secp256k1 3.1.0, labeled transitive | `npm ls` shows sole dependent is `@chainsafe/discv5@12.0.1`; not in package.json; node_modules 3.1.0 | verified |
| big.js 7.0.1 | `package.json` dependencies `"7.0.1"` | verified |
| dayjs 1.11.13 | `package.json` dependencies `"1.11.13"` | verified |
| Jest 30.4.2 | `package.json` devDependencies `"30.4.2"` | verified |
| @noble/secp256k1 webpack-externalized | `webpack.main.config.js:9-12` — `externals: { '@noble/secp256k1': 'commonjs @noble/secp256k1' }` | verified |
| @noble/secp256k1 jest-mocked | `package.json` jest config `moduleNameMapper: { "@noble/secp256k1": "<rootDir>/__mocks__/@noble/secp256k1.js" }`; mock file exists and is written against the v3.1.0 API (`keygen()`, `signAsync()`, …) | verified |

### 2. API-shape sanity

| Claim | Evidence | Status |
| --- | --- | --- |
| libp2p 3.3.2 + gossipsub 15.0.15 + discv5 12.0.1 coherent | All three resolve against the same installed interface generation: `@libp2p/interface 3.2.2`, `interface-internal 3.1.5`, `peer-id 6.0.9`, `crypto 5.1.18`, `multiaddr 13.0.3`. gossipsub 15.0.15 declares `@libp2p/interface ^3.1.0`, `interface-internal ^3.0.13`, `peer-id ^6.0.4`, `crypto ^5.1.13`, `multiaddr ^13.0.1` — all satisfied. discv5 12.0.1 depends on `@libp2p/interface`, `@libp2p/peer-id`, `@libp2p/crypto`, `@chainsafe/enr` (6.0.1, direct dep), `@noble/secp256k1` — all present. No version skew detected locally. | verified |
| Electron 42.3.0 plausibly current as of 2026-09 | electronjs.org (fetched 2026-09-20) shows latest stable **44.4.3** (Chromium 152). 42.3.0 is ~2 majors behind latest (Electron majors ship roughly every 8 weeks ⇒ 42.x is a ~2–3 month-old line). Plausible and coherent, not the newest. | verified (with note) |
| Express 5.2.1 exists | Installed at 5.2.1 with `engines.node >= 18`; satisfies Node 24 runtime. | verified |

### 3. Code-behavior fact claims

| Claim | Evidence | Status |
| --- | --- | --- |
| `syncWithRootState` exists in `api.js` | `src/main/api.js:130` — `const syncWithRootState = () => { … }`; exported at `api.js:151` | verified |
| `syncWithRootState` called from `src/main/index.js` at startup | `src/main/index.js:21` — `await api.syncWithRootState()` inside the `api.listen` callback of `createWindow()` (runs on `app.on('ready')`) | verified |
| `VALIDATION_RATE=1000` in `src/main/config.js` | `src/main/config.js:6` — `const VALIDATION_RATE = 1000 // how often to generate a block, how may transactions`; exported at `config.js:50` | verified |
| `VALIDATION_RATE` unused for mining intervals | Repo-wide grep: only 2 references (definition `config.js:6`, export `config.js:50`). No `setInterval` in `src/main/` drives mining; sole main-process timer is `pubsub.js:146` (`checkPeerChanges`, 5000 ms, peer bookkeeping — unrelated to mining) | verified |
| `DISCV5_BOOTSTRAP_ENRs` empty with VPS TODO | `src/config.js:20-23` — `const DISCV5_BOOTSTRAP_ENRs = [ // TODO: Replace with actual VPS bootstrap ENR after deployment … ]` | verified |
| `RELAY_ENDPOINTS` empty with VPS TODO | `src/config.js:25-28` — `const RELAY_ENDPOINTS = [ // TODO: Replace with actual VPS relay endpoint after deployment … ]` | verified |
| Mining triggered only via HTTP GET `/api/mine-transactions` → `TransactionMiner.mineTransactions` | `src/main/api.js:88-91` — `api.get('/api/mine-transactions', async (req,res) => { await transactionMiner.mineTransactions(); res.redirect('/api/blocks') })`. Sole caller of `mineTransactions`. No interval, no lottery anywhere in `src/main/`. (Renderer button at `src/renderer/components/TransactionPool.js:21-28,52` fires that same HTTP GET — still the HTTP path.) | verified |
| `Blockchain.replaceChain` rejects shorter/invalid chains | `src/main/blockchain/index.js:30-45` — rejects `chain.length <= this.chain.length` ("The incoming chain must be longer") and `!await Blockchain.isValidChain(chain)` ("The incoming chain must be valid"); genesis pinned by `isValidChain` (`index.js:47`) | verified |
| `Blockchain.addBlock` logs errors to stderr (grounds AD-9 target-state flag) | `src/main/blockchain/index.js:24` — `process.stderr.write('addBlock error: ' + error.message + '\n')` inside `addBlock`'s catch — a core unit performing I/O/logging, exactly the AD-9 violation the spine flags as target-state | verified |

## Findings

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| 1 | info | Spine's AD-9 flag is under-scoped: `addBlock`'s `process.stderr.write` (`blockchain/index.js:24`) is not the only core logging leak — `replaceChain` also calls `console.error` (lines 33, 37) and `console.log` (line 43), and `isValidChain` relies on them being absent from the happy path. The "Errors & logging" convention ("No `console`/`stderr` in core") is currently violated in 4 places in `blockchain/index.js`. | When the AD-9 follow-up change is scoped, list all 4 call sites in `blockchain/index.js` (24, 33, 37, 43), not just the stderr one. No spine change needed — the flag's direction is correct. |
| 2 | info | `syncWithRootState` (`api.js:130`) is not async and does not return/await its fetch promises, so `await api.syncWithRootState()` at `index.js:21` resolves immediately and the root sync races peer `replaceChain` calls. The spine's claim ("called at startup") is accurate, and the spine's Deferred table already records this race — but a reader of AD-5 alone might assume the await makes startup ordering deterministic. | Optional: add a sentence to the Deferred row (already there: "today `syncWithRootState` races peer `replaceChain`") — it is present and correct; no action required beyond keeping it. |
| 3 | info | Electron 42.3.0 is ~2 majors behind the latest stable (44.4.3 per electronjs.org, 2026-09-20). The pin is internally coherent (Forge 7.11.2 supports it; app runs on it) and "plausibly current" holds, but the Stack table presents 42.3.0 as the stack without a freshness caveat. | Optional: add "(N-2 majors behind latest stable at spine date; no action planned)" to the Stack row, or leave as-is if freshness is out of scope. |
| 4 | info | The Stack table's `@noble/secp256k1 (transitive; externalized, jest-mocked)` label is exactly right — `npm ls` shows the sole dependency path is `@chainsafe/discv5@12.0.1 → @noble/secp256k1@3.1.0`. Worth keeping the label: if discv5 is ever dropped, the crypto dep (and its webpack/jest wiring) disappears. | None — claim verified. |

## Verdict rationale

**PASS-WITH-FINDINGS.** Every stack-table row matches `package.json` pins and installed
`node_modules` byte-for-byte; the P2P stack (libp2p 3.3.2 / gossipsub 15.0.15 /
discv5 12.0.1) resolves against a single coherent `@libp2p/interface` 3.x generation;
Express 5.2.1 exists and supports the Node 24 runtime; and all six code-behavior fact
claims are confirmed in source. All findings are informational context notes
(AD-9 call-site scope, a no-op `await` on `syncWithRootState`, Electron freshness) —
none is a stale or wrong spine claim, and three of four are already acknowledged by the
spine's own Deferred table.
