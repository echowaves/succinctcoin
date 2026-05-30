## Purpose

Defines the transaction mining process that selects valid pending transactions from the pool and creates new blocks.

## Requirements

### Requirement: Transaction mining
The system SHALL mine a new block by collecting valid transactions from the pool, adding them to the blockchain, broadcasting the updated chain, and clearing mined transactions.

#### Scenario: Mine with valid transactions
- **WHEN** mineTransactions() is called and the pool contains valid transactions
- **THEN** a new block SHALL be created with those transactions, added to the chain, the chain broadcast to peers, and the pool cleared of included transactions

#### Scenario: Mine with empty pool
- **WHEN** mineTransactions() is called and the pool contains no valid transactions
- **THEN** a block SHALL still be created (with only the reward transaction), added to the chain, and broadcast

#### Scenario: Mine failure handled
- **WHEN** addBlock() fails to create a block (e.g., invalid wallet)
- **THEN** the mining process SHALL complete without crashing and the pool SHALL NOT be cleared

### Requirement: Valid transaction selection
The system SHALL filter the transaction pool to include only transactions that pass full validation before mining.

#### Scenario: Only valid transactions mined
- **WHEN** validTransactions() is called on the pool
- **THEN** only transactions that pass validate() SHALL be returned

#### Scenario: Invalid transactions excluded
- **WHEN** validTransactions() is called on a pool containing both valid and invalid transactions
- **THEN** only valid transactions SHALL be returned

### Requirement: Post-mining cleanup
The system SHALL remove mined transactions from the pool after a block is successfully created.

#### Scenario: Mined transactions cleared
- **WHEN** a block is successfully mined
- **THEN** all transactions included in that block SHALL be removed from the transaction pool
