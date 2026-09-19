## MODIFIED Requirements

### Requirement: Transaction mining
The system SHALL mine a new block by collecting valid transactions from the pool, adding them to the blockchain, broadcasting the updated chain, and clearing mined transactions. When the pool contains no valid transactions the system MAY still create a block containing only the reward transaction, and that reward-only block SHALL be accepted by the validator (see blockchain-core/spec.md).

#### Scenario: Mine with valid transactions
- **WHEN** mineTransactions() is called and the pool contains valid transactions
- **THEN** a new block SHALL be created with those transactions, added to the chain, the chain broadcast to peers, and the pool cleared of included transactions

#### Scenario: Mine with empty pool
- **WHEN** mineTransactions() is called and the pool contains no valid transactions
- **THEN** a block SHALL still be created (with only the reward transaction), added to the chain, and broadcast

#### Scenario: Reward credited to miner
- **WHEN** a block is mined with a reward-only transaction
- **THEN** the reward SHALL be credited to the miner's account as a mint

#### Scenario: Mine failure handled
- **WHEN** addBlock() fails to create a block (e.g., invalid wallet)
- **THEN** the mining process SHALL complete without crashing and the pool SHALL NOT be cleared
