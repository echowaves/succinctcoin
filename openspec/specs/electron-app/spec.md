## Purpose

Defines the Electron desktop application shell, Express API server, React renderer UI, and data persistence layer.

## Requirements

### Requirement: Express API server
The system SHALL run an Express API server in the Electron main process exposing blockchain operations via HTTP endpoints.

#### Scenario: Get blockchain
- **WHEN** GET /api/blocks is called with optional pagination (offset, limit)
- **THEN** the system SHALL return the requested slice of the blockchain

#### Scenario: Get transaction pool
- **WHEN** GET /api/transaction-pool-map is called
- **THEN** the system SHALL return all pending transactions in the pool

#### Scenario: Create transaction
- **WHEN** POST /api/transact is called with recipient, amount, and fee
- **THEN** the system SHALL create a signed transaction, add it to the pool, and broadcast it to peers

#### Scenario: Mine transactions
- **WHEN** GET /api/mine-transactions is called
- **THEN** the system SHALL mine a new block with valid pool transactions and broadcast the updated chain

#### Scenario: Get wallet info
- **WHEN** GET /api/wallet-info is called
- **THEN** the system SHALL return the wallet's public key (address) and account balance

### Requirement: Electron window management
The system SHALL create a BrowserWindow loading the webpack-bundled renderer and manage the application lifecycle.

#### Scenario: App ready creates window
- **WHEN** the Electron app emits the 'ready' event
- **THEN** a BrowserWindow SHALL be created loading the main_window webpack entry

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
