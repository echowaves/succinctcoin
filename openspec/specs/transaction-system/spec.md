## Purpose

Defines transaction creation, validation rules (fees, balances, signatures), and the transaction pool mempool for pending transactions.

## Requirements

### Requirement: Transaction structure
The system SHALL create transactions with uuid, timestamp, sender, recipient, amount, fee, and signature fields.

#### Scenario: Transaction fields populated
- **WHEN** a transaction is created
- **THEN** it SHALL have a unique UUID, current UTC timestamp, sender public key, recipient public key, amount (big.js string), fee (big.js string), and signature

### Requirement: Transaction validation
The system SHALL validate transactions by checking field integrity, balance sufficiency, and signature correctness.

#### Scenario: Valid transaction passes
- **WHEN** a transaction has valid sender/recipient public keys, amount > 0, fee >= amount/1000, sufficient sender balance, and valid signature
- **THEN** validation SHALL succeed

#### Scenario: Insufficient balance rejected
- **WHEN** sender's account balance is less than amount + fee
- **THEN** validation SHALL reject the transaction

#### Scenario: Fee too low rejected
- **WHEN** transaction fee is less than 0.1% of the amount (amount/1000)
- **THEN** validation SHALL reject the transaction

#### Scenario: Invalid sender rejected
- **WHEN** the sender field is not a valid public key
- **THEN** validation SHALL reject the transaction

#### Scenario: Self-transfer rejected
- **WHEN** sender equals recipient
- **THEN** validation SHALL reject the transaction

#### Scenario: Invalid signature rejected
- **WHEN** the transaction signature does not match the sender's public key
- **THEN** validation SHALL reject the transaction

### Requirement: Reward transaction validation
The system SHALL allow reward transactions where sender is a miner and recipient is *authorized-reward* with exactly 100 coins.

#### Scenario: Valid reward transaction
- **WHEN** a transaction has recipient=*authorized-reward* and amount=100
- **THEN** validation SHALL succeed without balance checks

#### Scenario: Invalid reward amount rejected
- **WHEN** a reward transaction has amount != 100
- **THEN** validation SHALL reject the transaction

#### Scenario: Reward transaction fee must be zero
- **WHEN** a reward transaction has a non-zero fee
- **THEN** validation SHALL reject the transaction

### Requirement: Stake transaction validation
The system SHALL allow stake transactions where recipient is *authorized-stake* with amount >= 200 and not exceeding 10% of balance.

#### Scenario: Valid stake transaction
- **WHEN** a transaction has recipient=*authorized-stake*, amount >= 200, and amount <= 10% of sender balance
- **THEN** validation SHALL succeed

#### Scenario: Stake too small rejected
- **WHEN** a stake transaction has amount < 200
- **THEN** validation SHALL reject the transaction

#### Scenario: Stake exceeds limit rejected
- **WHEN** a stake transaction amount exceeds 10% of sender balance
- **THEN** validation SHALL reject the transaction

#### Scenario: Zero stake rejected
- **WHEN** a stake transaction has amount = 0
- **THEN** validation SHALL reject the transaction

### Requirement: Transaction pool management
The system SHALL maintain a pool of unconfirmed transactions, filtering valid ones for mining and clearing mined transactions.

#### Scenario: Add transaction to pool
- **WHEN** a new transaction is received
- **THEN** it SHALL be stored in the pool indexed by UUID

#### Scenario: Prevent duplicate sender transactions
- **WHEN** a sender already has a transaction in the pool
- **THEN** existingTransaction() SHALL find the existing transaction by sender public key

#### Scenario: Valid transactions filtered for mining
- **WHEN** validTransactions() is called on the pool
- **THEN** only transactions that pass validate() SHALL be returned

#### Scenario: Invalid transactions excluded
- **WHEN** validTransactions() is called on a pool containing both valid and invalid transactions
- **THEN** only valid transactions SHALL be returned

#### Scenario: Clear mined transactions
- **WHEN** a block is mined containing pool transactions
- **THEN** those transactions SHALL be removed from the pool by UUID

#### Scenario: Clear all transactions
- **WHEN** clear() is called on the pool
- **THEN** all transactions SHALL be removed from the pool

#### Scenario: Set pool from external map
- **WHEN** setMap() is called with a transaction map
- **THEN** the pool SHALL be replaced with the provided map
