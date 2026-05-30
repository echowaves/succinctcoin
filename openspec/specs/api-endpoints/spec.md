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
- **THEN** the response SHALL be a JSON object containing the chain length

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
The system SHALL trigger block mining and redirect to the blocks endpoint.

#### Scenario: Trigger mining
- **WHEN** GET /api/mine-transactions is called
- **THEN** the transaction miner SHALL create a block with valid pool transactions and the response SHALL redirect to /api/blocks

### Requirement: Create transaction
The system SHALL create a signed transaction, validate it, add it to the pool, broadcast it, and return the result.

#### Scenario: Successful transaction
- **WHEN** POST /api/transact is called with a valid recipient and amount
- **THEN** the system SHALL create a transaction with auto-calculated fee (amount/1000), validate it, add it to the pool, broadcast it to peers, and return {type: 'success', transaction}

#### Scenario: Invalid transaction rejected
- **WHEN** POST /api/transact is called with invalid data (e.g., insufficient balance)
- **THEN** the system SHALL return {type: 'error', message: <error message>} with HTTP 400 status

#### Scenario: Fee auto-calculated
- **WHEN** a transaction is created via /api/transact
- **THEN** the fee SHALL be automatically calculated as amount / 1000 (0.1%)

### Requirement: Get transaction pool
The system SHALL return all pending transactions in the pool.

#### Scenario: Retrieve pool contents
- **WHEN** GET /api/transaction-pool-map is called
- **THEN** the response SHALL be a JSON object mapping transaction UUIDs to transaction objects

### Requirement: Get wallet information
The system SHALL return the wallet's public key and associated account data.

#### Scenario: Retrieve wallet info via HTTP
- **WHEN** GET /api/wallet-info is called
- **THEN** the response SHALL contain {address: <publicKey>, account: <account object>}

#### Scenario: Retrieve wallet info via IPC
- **WHEN** the renderer process sends an IPC message to /api/wallet-info
- **THEN** the main process SHALL return {address: <publicKey>, account: <account object>} synchronously

### Requirement: List known addresses
The system SHALL return all account public keys that have been persisted to disk.

#### Scenario: Retrieve known addresses
- **WHEN** GET /api/known-addresses is called
- **THEN** the response SHALL be an array of account public key hashes stored in the accounts directory

### Requirement: API initialization
The system SHALL initialize the wallet, account, pubsub, and transaction miner before serving requests.

#### Scenario: Init loads wallet
- **WHEN** api.init() is called
- **THEN** the wallet SHALL be retrieved from disk (or created if new), the associated account SHALL be ensured, pubsub SHALL start, and the transaction miner SHALL be instantiated

#### Scenario: Init handles pubsub failure
- **WHEN** pubsub.discoverPeers() fails during initialization
- **THEN** the error SHALL be logged but the API SHALL continue to operate

### Requirement: Root state synchronization
The system SHALL synchronize local blockchain and transaction pool state with the root node.

#### Scenario: Sync blockchain from root
- **WHEN** syncWithRootState() is called
- **THEN** the local blockchain SHALL be replaced with the chain fetched from ROOT_NODE_ADDRESS/api/blocks

#### Scenario: Sync pool from root
- **WHEN** syncWithRootState() is called
- **THEN** the local transaction pool SHALL be replaced with the pool map fetched from ROOT_NODE_ADDRESS/api/transaction-pool-map
