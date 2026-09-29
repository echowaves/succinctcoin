## Purpose

Defines the Electron desktop application shell, Express API server, React renderer UI, and data persistence layer.

## Requirements

### Requirement: Express API server integration
The system SHALL host the Express API server in the Electron main process and start it during api.init(). The endpoint contracts (GET /api/blocks, GET /api/blocks/length, GET /api/blocks/:id, GET /api/transaction-pool-map, POST /api/transact, and GET /api/mine-transactions, which is registered only on development builds) are defined in api-endpoints/spec.md and SHALL be referenced here, not restated.

#### Scenario: API server integration
- **WHEN** the Electron main process initializes the API server
- **THEN** the server SHALL expose the endpoints defined in api-endpoints/spec.md and the electron-app spec SHALL reference (not restate) them

### Requirement: Electron window management
The system SHALL create a BrowserWindow loading the webpack-bundled renderer and manage the application lifecycle. The BrowserWindow MUST use secure webPreferences: `nodeIntegration` SHALL be `false`, `contextIsolation` SHALL be `true`, and `webSecurity` SHALL be `true`. The renderer process MUST NOT have direct access to Node.js APIs and SHALL communicate with the main process exclusively through the `contextBridge` exposed in the preload script.

#### Scenario: App ready creates window
- **WHEN** the Electron app emits the 'ready' event
- **THEN** a BrowserWindow SHALL be created loading the main_window webpack entry

#### Scenario: Secure webPreferences
- **WHEN** the BrowserWindow is created
- **THEN** `webPreferences.nodeIntegration` SHALL be `false`
- **THEN** `webPreferences.contextIsolation` SHALL be `true`
- **THEN** `webPreferences.webSecurity` SHALL be `true`

#### Scenario: Renderer cannot access Node.js APIs
- **WHEN** renderer code attempts to call `require()` from a component
- **THEN** the call SHALL fail because `require` is not available in the renderer context

#### Scenario: Renderer communicates via preload bridge
- **WHEN** renderer needs data from the main process
- **THEN** it SHALL use `window.electronAPI` methods exposed by the preload script through `contextBridge`

#### Scenario: All windows closed quits app (non-macOS)
- **WHEN** all windows are closed on Windows/Linux
- **THEN** the application SHALL quit

### Requirement: React renderer UI
The system SHALL provide a React-based UI with navigation between wallet, blocks, transactions, and transaction pool views.

#### Scenario: Wallet view displays address and balance
- **WHEN** the user navigates to the wallet view
- **THEN** the wallet's public key and current balance SHALL be displayed

#### Scenario: Conduct transaction form
- **WHEN** the user fills in recipient, amount, fee and submits
- **THEN** a POST request SHALL be sent to /api/transact

#### Scenario: Blocks view with pagination
- **WHEN** the user views the blocks page
- **THEN** blocks SHALL be loaded via /api/blocks with pagination support

#### Scenario: Transaction pool view
- **WHEN** the user views the transaction pool
- **THEN** pending transactions SHALL be fetched from /api/transaction-pool-map

### Requirement: Data persistence across restarts
The system SHALL persist wallet keys, account data, and blockchain data under the application's storage root: ~/.succinctcoin/ in normal operation, and .test/ only while a test worker runs (JEST_WORKER_ID set) — development mode does NOT redirect storage. On startup the wallet SHALL be restored through a strict load: a valid existing file reinstalls its key pair, and ANY failure (corrupt, misshapen, or failing cross-derivation) fails fast with a typed `corrupted-wallet` error that aborts startup — never a silent fallback to a fresh identity. The blockchain SHALL start at the canonical genesis block on every startup; an external chain is adopted only through root bootstrap or peer sync under the chain-replacement rules.

#### Scenario: Wallet restored on startup
- **WHEN** the application starts with a valid existing wallet file at ~/.succinctcoin/wallet
- **THEN** the wallet SHALL be loaded with its existing key pair

#### Scenario: Corrupt wallet fails startup
- **WHEN** the application starts with a wallet file that fails the strict load
- **THEN** startup SHALL fail fast with a typed `corrupted-wallet` error, and the application SHALL NOT fall back to a fresh identity

#### Scenario: Blockchain starts from genesis
- **WHEN** the application starts
- **THEN** the chain SHALL contain exactly the canonical genesis block, and any longer chain SHALL be adopted only via root bootstrap or peer sync per the chain-replacement rules

#### Scenario: Test worker uses separate storage
- **WHEN** a test worker (JEST_WORKER_ID set) persists application data
- **THEN** persistence SHALL use the .test/ directory instead of ~/.succinctcoin/
