## Purpose

Defines the application configuration constants, storage paths, network channels, and environment detection for SuccinctCoin.

## Requirements

### Requirement: Storage paths
The system SHALL define persistent storage paths for wallet, accounts, blocks, and UUIDs under a root directory.

#### Scenario: Production storage path
- **WHEN** the application runs outside of test mode (JEST_WORKER_ID is undefined)
- **THEN** the root storage path SHALL be ~/.succinctcoin/

#### Scenario: Test storage path
- **WHEN** the application runs in test mode (JEST_WORKER_ID is defined)
- **THEN** the root storage path SHALL be .test/

#### Scenario: Subdirectories created on startup
- **WHEN** the application starts
- **THEN** the root, accounts, and blocks directories SHALL be created if they do not exist

### Requirement: Genesis block data
The system SHALL define immutable genesis block data with fixed values.

#### Scenario: Genesis block fields
- **WHEN** the genesis data is accessed
- **THEN** it SHALL contain: height=0, uuid="GENESIS", timestamp=0, validator="GENESIS", lastHash="GENESIS", hash="GENESIS", data=["GENESIS"], signature="GENESIS"

### Requirement: Reward configuration
The system SHALL define fixed reward parameters for block mining.

#### Scenario: Reward amount
- **WHEN** the reward amount is accessed
- **THEN** it SHALL be 100 coins

#### Scenario: Minimum stake amount
- **WHEN** the minimum stake amount is accessed
- **THEN** it SHALL be 200 coins

### Requirement: Special addresses
The system SHALL define three special recipient addresses for blockchain operations.

#### Scenario: Reward address
- **WHEN** the reward address is accessed
- **THEN** it SHALL be "*authorized-reward*"

#### Scenario: Stake address
- **WHEN** the stake address is accessed
- **THEN** it SHALL be "*authorized-stake*"

#### Scenario: Credit address
- **WHEN** the credit address is accessed
- **THEN** it SHALL be "*authorized-credit*"

### Requirement: Network configuration
The system SHALL define API port and pubsub channel names based on the running environment.

#### Scenario: Development port
- **WHEN** the application runs in development mode
- **THEN** the API port SHALL be 3001

#### Scenario: Production port
- **WHEN** the application runs in production mode
- **THEN** the API port SHALL be 3333

#### Scenario: Development channel prefix
- **WHEN** the application runs in development mode
- **THEN** pubsub channels SHALL be prefixed with "DEV-succinctcoin-"

#### Scenario: Production channel prefix
- **WHEN** the application runs in production mode
- **THEN** pubsub channels SHALL be prefixed with "succinctcoin-"

#### Scenario: Blockchain channel name
- **WHEN** the blockchain channel is accessed
- **THEN** it SHALL be {prefix}BLOCKCHAIN

#### Scenario: Transaction channel name
- **WHEN** the transaction channel is accessed
- **THEN** it SHALL be {prefix}TRANSACTION

### Requirement: Root node address
The system SHALL define the root node API address for inter-node synchronization.

#### Scenario: Root node address in development
- **WHEN** the application runs in development mode
- **THEN** ROOT_NODE_ADDRESS SHALL be "http://localhost:3001"

#### Scenario: Root node address in production
- **WHEN** the application runs in production mode
- **THEN** ROOT_NODE_ADDRESS SHALL be "http://localhost:3333"
