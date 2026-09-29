## Purpose

Defines all HTTP and IPC API endpoints exposed by the Express server in the Electron main process.

## Requirements

### Requirement: Get full blockchain
The system SHALL return the complete blockchain as a JSON array when the blocks endpoint is requested.

#### Scenario: Retrieve all blocks
- **WHEN** GET /api/blocks is called
- **THEN** the response SHALL be a JSON array of all blocks in the chain, starting with the genesis block

### Requirement: Get blockchain length
The system SHALL return the total number of blocks in the chain.

#### Scenario: Retrieve chain length
- **WHEN** GET /api/blocks/length is called
- **THEN** the response SHALL be the chain length serialized as a bare JSON number

### Requirement: Paginated block retrieval
The system SHALL return a paginated slice of blocks in reverse order (newest first), with 5 blocks per page.

#### Scenario: Retrieve first page
- **WHEN** GET /api/blocks/1 is called
- **THEN** the response SHALL contain the 5 most recent blocks (or fewer if the chain is shorter)

#### Scenario: Retrieve subsequent page
- **WHEN** GET /api/blocks/2 is called
- **THEN** the response SHALL contain blocks 6-10 from the end of the chain

#### Scenario: Page beyond chain length
- **WHEN** GET /api/blocks/:id is called with an id that exceeds the chain length
- **THEN** the startIndex SHALL be clamped to the chain length and an empty array SHALL be returned

### Requirement: Mine transactions
The system SHALL expose block mining exclusively through the autonomous miner (see transaction-miner/spec.md). The HTTP endpoint `GET /api/mine-transactions` is a development-only convenience: it is registered only on development builds, where it triggers one immediate mine and redirects to the blocks endpoint. On non-development builds the route SHALL NOT exist; autonomous mining is the mining path.

#### Scenario: Trigger mining on a development build
- **WHEN** GET /api/mine-transactions is called on a development build
- **THEN** one immediate mine SHALL run (pool validity filtering applied, lottery not consulted), the chain SHALL be broadcast on success, and the response SHALL redirect to /api/blocks

#### Scenario: Route absent on non-development builds
- **WHEN** GET /api/mine-transactions is called on a non-development build
- **THEN** the request SHALL receive no registered handler (HTTP 404)

### Requirement: Create transaction
The system SHALL create a signed transaction, validate it, add it to the pool, broadcast it, and return the result. The fee SHALL be automatically calculated as amount / 1000 (0.1%) in big.js arithmetic — the client SHALL NOT supply a fee.

#### Scenario: Successful transaction
- **WHEN** POST /api/transact is called with a valid recipient and amount
- **THEN** the system SHALL create a transaction with auto-calculated fee (amount/1000), validate it, add it to the pool, broadcast it to peers, and return {type: 'success', transaction}

#### Scenario: Invalid transaction rejected
- **WHEN** POST /api/transact is called with a syntactically valid amount whose created transaction fails validation against the derived chain state
- **THEN** the response SHALL be the error envelope {type: 'error', code, message} with the status for the typed failure: 400 for `invalid-transaction`, `invalid-signature`, and `invalid-hash` codes, 402 for `insufficient-balance`

#### Scenario: Pending duplicate from the same sender rejected
- **WHEN** POST /api/transact is called by a sender that already has a pending transaction in the pool
- **THEN** the response SHALL return {type: 'error', code: 'duplicate-transaction', message: <error message>} with HTTP 409 status

#### Scenario: Fee auto-calculated
- **WHEN** a transaction is created via /api/transact
- **THEN** the fee SHALL be automatically calculated as amount / 1000 (0.1%), using big.js; the client SHALL NOT be able to supply a fee

### Requirement: Amount validation
The system SHALL pre-check the amount on the create-transaction endpoint: an amount that cannot be parsed by big.js (non-numeric, non-finite, or otherwise invalid) SHALL be rejected before any transaction is created.

#### Scenario: Syntactically invalid amount rejected
- **WHEN** POST /api/transact is called with an amount that big.js cannot parse
- **THEN** the response SHALL return {type: 'error', code: 'invalid-transaction', message: <error message>} with HTTP 400 status

#### Scenario: Invalid-value amount rejected by validation
- **WHEN** POST /api/transact is called with a syntactically valid amount whose created transaction fails structural validation (for example a non-positive amount)
- **THEN** the response SHALL return {type: 'error', code: 'invalid-transaction', message: <error message>} with HTTP 400 status

### Requirement: Unexpected failure responses
The system SHALL map any failure without a documented typed error code to an unexpected-error response, with the error code and message owned by the app layer's error mapping.

#### Scenario: Server failure returns 500
- **WHEN** transaction creation fails with an error that carries no documented typed code
- **THEN** the response SHALL return {type: 'error', code: 'unexpected-error', message: <error message>} with HTTP 500 status

#### Scenario: No 401 or 403 responses
- **WHEN** any request that requires a wallet is served
- **THEN** the wallet SHALL have been loaded strictly at initialization before any request can be served, so a missing-wallet state at request time is unreachable and no 401 or 403 responses are produced

### Requirement: Get transaction pool
The system SHALL return all pending transactions in the pool.

#### Scenario: Retrieve pool contents
- **WHEN** GET /api/transaction-pool-map is called
- **THEN** the response SHALL be a JSON object mapping transaction UUIDs to transaction objects

### Requirement: Get wallet information
The system SHALL return the wallet's public key and associated account data exclusively through a synchronous IPC pull: the renderer SHALL send the `/api/wallet-info` channel, and the main process SHALL answer synchronously with `{address: <publicKey>, account: <account object>}`. There is no HTTP wallet-info route: every HTTP endpoint is listed in the API endpoint surface requirement above.

#### Scenario: Retrieve wallet info via IPC
- **WHEN** the renderer process sends an IPC message to /api/wallet-info
- **THEN** the main process SHALL return {address: <publicKey>, account: <account object>} synchronously

### Requirement: API port retrieval
The system SHALL expose the API port to the renderer exclusively through a synchronous IPC pull: the preload bridge's `getApiPort()` method SHALL send the `/api/port` channel and the main process SHALL answer synchronously with the port value owned by the app configuration. The renderer SHALL NOT import the configuration directly.

#### Scenario: Retrieve API port via IPC
- **WHEN** the renderer calls getApiPort()
- **THEN** the main process SHALL answer the /api/port channel synchronously with DEFAULT_PORT from app configuration

### Requirement: Wallet export and restore
The system SHALL expose encrypted wallet backup export and restore exclusively through synchronous IPC: `/api/wallet-export` returns the encrypted backup string for a password, and `/api/wallet-restore` replaces the wallet identity from an encrypted backup for its password (the restored identity is persisted to the wallet file, so it survives a restart). A failed operation SHALL be answered with a typed error shape, never by throwing back over IPC.

#### Scenario: Export backup via IPC
- **WHEN** the renderer sends /api/wallet-export with a non-empty password
- **THEN** the main process SHALL answer synchronously with the encrypted backup string (see wallet/spec.md "Wallet backup and recovery")

#### Scenario: Restore backup via IPC
- **WHEN** the renderer sends /api/wallet-restore with a valid backup and its password
- **THEN** the main process SHALL answer synchronously with the restored public key, the wallet identity SHALL be replaced AND persisted to the wallet file

#### Scenario: Failed export or restore answered with a typed code
- **WHEN** an export or restore fails (invalid password shape, malformed or tampered backup, or authentication failure)
- **THEN** the main process SHALL answer synchronously with {code, message} (code `invalid-backup` for restore failures) and the wallet SHALL be unchanged

### Requirement: API initialization
The system SHALL initialize the wallet, account, pubsub, and transaction miner before serving requests.

#### Scenario: Init loads wallet
- **WHEN** api.init() is called
- **THEN** the wallet SHALL be loaded strictly (first run persists the generated key pair; a present but corrupted wallet file fails fast with a typed error and aborts startup), the associated account SHALL be ensured, pubsub SHALL be constructed, and the transaction miner SHALL be instantiated and started

#### Scenario: Init handles pubsub failure
- **WHEN** pubsub.discoverPeers() fails during initialization
- **THEN** the error SHALL be logged but the API SHALL continue to operate

### Requirement: Root state synchronization
The system SHALL synchronize local blockchain and transaction pool state with the root node strictly for bootstrap: the local chain is adopted from the root only while the local chain is genesis-only, and the local pool is merged from the root additively. The root has no standing authority over either half.

#### Scenario: Chain synced only while empty
- **WHEN** syncWithRootState() is called and the local chain is genesis-only
- **THEN** the chain fetched from ROOT_NODE_ADDRESS/api/blocks SHALL be adopted through the normal chain-replacement rules (valid and strictly longer, or equal-length lower-hash), and a non-empty local chain SHALL make the root's chain be ignored entirely

#### Scenario: Pool merged additively
- **WHEN** syncWithRootState() is called
- **THEN** the pool map fetched from ROOT_NODE_ADDRESS/api/transaction-pool-map SHALL be merged into the local pool by transaction uuid (local entries win on collision, an empty local pool adopts the root's map wholesale), and the local pool SHALL NEVER be fully replaced by a remote map
