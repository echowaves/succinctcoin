Normal mode. Clear, direct technical communication. Code/commits/PRs written normally.

<!-- bmad:context -->
<!-- Verified 2026-09-19 against 67b3bdb. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## succinctcoin

Distributed blockchain wallet: an Electron 42 app (Electron Forge + Webpack) with a Rust-free JavaScript core. Main-process core lives in `src/main/`; the React 19 renderer is UI only. Structured development flows through OpenSpec (`/opsx:*` slash commands in `.clinerules/workflows/`); change history and specs live in `openspec/`.

## Policy

- Respect OpenSpec mode boundaries: `/opsx:explore` and `/opsx:propose` are analysis/planning only — no `src/` edits or implementation runs until `/opsx:apply`. See `.clinerules/workflows/`.
- Trunk-based on `main`; PRs only, never push directly. `origin/HEAD` is set to `main`.
- No secrets and no config files exist. Wallet keys are generated at runtime and stored in `~/.succinctcoin/`; `.env`/`.env.test` are gitignored. Never add a secrets file or hardcode a key.

## Where things are

- Main process entry: `src/main/index.js`. Blockchain core: `src/main/blockchain/{block,transaction,transaction-pool,wallet,account,index}.js`. Crypto util: `src/main/util/crypto.js`.
- Renderer: `src/renderer` (react-bootstrap + react-router-dom) — UI only, no state store.
- P2P (libp2p gossipsub/yamux/circuit-relay/discv5): `src/main/app/pubsub.js`, `transaction-miner.js`.
- discv5 bootstrap/VPS setup: `docs/bootstrap-node.md`.
- OpenSpec changes: `openspec/changes/`; planning/implementation artifacts: `_bmad-output/`.

## Running and verifying

- Run tests with `npm test` (`jest --ci --coverage`). Do **not** use `npm run test:ci` — it is `jest --watch` and hangs in CI.
- Lint: `npm run lint` (`eslint . --ext .js,.ts`).
- App: `npm start` (electron-forge), `npm run package`, `npm run make`. Node 24; no Rust/Cargo toolchain — do not try to run `cargo` or `rustc`.

## Conventions that differ from defaults

- Money is handled with `big.js`, never JavaScript floats; amounts are integer units.
- Signing uses `@noble/secp256k1` via `src/main/util/crypto.js` (sha512 hash of sorted JSON, hex-encoded). The package is webpack-externalized and mocked in tests.
- One wallet per app instance; created once on construction, persisted to `~/.succinctcoin/wallet`.
- Create transactions only via `Wallet.createTransaction`; they are signed before the pool and must not be modified afterward.

## Known pitfalls

- `CLAUDE.md` lists React Native/Expo/Jotai/Apollo — **none are installed**; the real stack is Electron/Node/React 19. Verify the tech stack against `package.json` before trusting it.
- `npm run test:ci` uses `--watch` and hangs CI — use `npm test`.
- The name "succinctcoin" implies Rust, but the blockchain core is JavaScript — do not run `cargo`/`rustc`.
- The wallet private key is written to disk at `~/.succinctcoin/wallet`; treat it as a real secret, not an ephemeral in-memory value.

<!-- /bmad:context -->
