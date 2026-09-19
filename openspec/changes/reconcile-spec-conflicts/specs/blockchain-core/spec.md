## MODIFIED Requirements

### Requirement: Genesis block initialization
The system SHALL initialize the blockchain with a single genesis block containing the canonical predefined values (height 0, uuid="GENESIS", timestamp=0, validator="GENESIS", lastHash="GENESIS", hash="GENESIS", data=["GENESIS"], signature="GENESIS"). The genesis definition in configuration/spec.md is authoritative.

#### Scenario: New blockchain starts with genesis
- **WHEN** a new Blockchain instance is created
- **THEN** the chain SHALL contain exactly one block (the genesis block) with height 0, uuid="GENESIS", and the canonical genesis values

#### Scenario: Genesis block is immutable
- **WHEN** a block claims to be at height 0 with any field (uuid, validator, lastHash, hash, data, signature) different from the canonical genesis
- **THEN** chain validation SHALL reject the chain as invalid

## MODIFIED Requirements

### Requirement: Block validation
The system SHALL validate each block by checking hash integrity, signature validity, transaction ordering, reward uniqueness, and structural constraints.

#### Scenario: Valid block passes validation
- **WHEN** a block has correct hash, valid signature, properly ordered transactions, and exactly one reward transaction
- **THEN** validation SHALL succeed

#### Scenario: Duplicate transactions rejected
- **WHEN** a block contains two transactions with the same UUID
- **THEN** validation SHALL reject the block

#### Scenario: Multiple reward transactions rejected
- **WHEN** a block contains more than one reward transaction
- **THEN** validation SHALL reject the block

#### Scenario: Invalid hash rejected
- **WHEN** a block's hash does not match SHA512 of its contents
- **THEN** validation SHALL reject the block

#### Scenario: Invalid signature rejected
- **WHEN** a block's signature does not match the miner's public key
- **THEN** validation SHALL reject the block

#### Scenario: Transaction timestamp ordering enforced
- **WHEN** transactions in a block are not sorted by timestamp (reward last)
- **THEN** validation SHALL reject the block

#### Scenario: Empty block rejected after bootstrap
- **WHEN** a block at height > 3 contains only a reward transaction (no user transactions) AND was not mined with an empty pool
- **THEN** validation SHALL reject the block as empty data

#### Scenario: Reward-only block on empty pool accepted
- **WHEN** a block at height > 3 contains only a reward transaction AND was mined because the transaction pool had no valid transactions
- **THEN** validation SHALL accept the block as a valid empty-pool block

#### Scenario: Invalid miner rejected
- **WHEN** a block's miner field is not a valid public key
- **THEN** validation SHALL reject the block

#### Scenario: Transaction timestamp must precede block
- **WHEN** a non-reward transaction has a timestamp >= the block's timestamp
- **THEN** validation SHALL reject the block

#### Scenario: Reward transaction must share block timestamp
- **WHEN** a reward transaction has a timestamp different from the block's timestamp
- **THEN** validation SHALL reject the block
