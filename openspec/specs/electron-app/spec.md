## Purpose

Defines the Electron desktop application shell, Express API server, React renderer UI, and data persistence layer.

## Requirements

### Requirement: Express API server integration
The system SHALL host the Express API server in the Electron main process and start it during api.init(). The endpoint contracts (GET /api/blocks, GET /api/transaction-pool-map, POST /api/transact, GET /api/mine-transactions, GET /api/wallet-info) are defined in api-endpoints/spec.md and SHALL be referenced here, not restated.

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
The system SHALL persist wallet keys, account balances, and blockchain data to disk and restore them on startup.

#### Scenario: Wallet restored on startup
- **WHEN** the application starts with an existing wallet file at ~/.succinctcoin/wallet
- **THEN** the wallet SHALL be loaded with its existing key pair

#### Scenario: Blockchain restored on startup
- **WHEN** the application starts with existing block files
- **THEN** the blockchain SHALL be reconstructed from persisted blocks

#### Scenario: Dev mode uses separate storage
- **WHEN** running in development mode
- **THEN** persistence SHALL use .test/ directory instead of ~/.succinctcoin/
