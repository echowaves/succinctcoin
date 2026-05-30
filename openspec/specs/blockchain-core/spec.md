## Purpose

Defines the core blockchain data structure, block mining, validation rules, and chain consensus mechanism for SuccinctCoin.

## Requirements

### Requirement: Genesis block initialization
The system SHALL initialize the blockchain with a single genesis block containing predefined values (height 0, lastHash "none", hash "hash-one", data []).

#### Scenario: New blockchain starts with genesis
- **WHEN** a new Blockchain instance is created
- **THEN** the chain SHALL contain exactly one block (the genesis block) with height 0

#### Scenario: Genesis block is immutable
- **WHEN** a block claims to be at height 0 with different data than the canonical genesis
- **THEN** chain validation SHALL reject the chain as invalid

### Requirement: Block mining
The system SHALL allow mining new blocks by creating a reward transaction, computing a SHA512 hash of block contents, and signing the hash with the miner's private key.

#### Scenario: Successful block mining
- **WHEN** a wallet mines a block with valid transactions
- **THEN** the block SHALL contain a reward transaction (100 coins to miner), all transactions sorted by timestamp, a valid SHA512 hash, and the miner's ECDSA signature

#### Scenario: Block height increments
- **WHEN** a new block is mined on top of the chain
- **THEN** the block height SHALL equal the previous block's height plus 1

#### Scenario: Block links to previous
- **WHEN** a new block is mined
- **THEN** the block's lastHash SHALL equal the previous block's hash

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
- **WHEN** a block at height > 3 contains only a reward transaction (no user transactions)
- **THEN** validation SHALL reject the block as empty data

#### Scenario: Invalid miner rejected
- **WHEN** a block's miner field is not a valid public key
- **THEN** validation SHALL reject the block

#### Scenario: Transaction timestamp must precede block
- **WHEN** a non-reward transaction has a timestamp >= the block's timestamp
- **THEN** validation SHALL reject the block

#### Scenario: Reward transaction must share block timestamp
- **WHEN** a reward transaction has a timestamp different from the block's timestamp
- **THEN** validation SHALL reject the block

### Requirement: Chain validation
The system SHALL validate an entire chain by checking genesis block correctness and validating each subsequent block.

#### Scenario: Valid chain accepted
- **WHEN** all blocks in the chain pass individual validation and link correctly
- **THEN** the chain SHALL be considered valid

#### Scenario: Broken chain link rejected
- **WHEN** a block's lastHash does not match the preceding block's hash
- **THEN** the chain SHALL be considered invalid

#### Scenario: Invalid genesis rejected
- **WHEN** the first block in a chain does not match the canonical genesis block
- **THEN** the chain SHALL be considered invalid

### Requirement: Chain replacement (consensus)
The system SHALL replace its current chain with an incoming chain if the incoming chain is longer and valid.

#### Scenario: Longer valid chain replaces current
- **WHEN** a peer broadcasts a chain longer than the local chain AND the chain is valid
- **THEN** the local chain SHALL be replaced with the incoming chain

#### Scenario: Shorter chain ignored
- **WHEN** a peer broadcasts a chain shorter than or equal to the local chain
- **THEN** the local chain SHALL remain unchanged

#### Scenario: Invalid longer chain rejected
- **WHEN** a peer broadcasts a longer chain that fails validation
- **THEN** the local chain SHALL remain unchanged

### Requirement: Block persistence
The system SHALL persist each block to disk keyed by its height.

#### Scenario: Block stored by height
- **WHEN** a block is created
- **THEN** its storage key SHALL be blocks/{height padded to 21 digits}

#### Scenario: Block retrieved by height
- **WHEN** a block is retrieved from disk
- **THEN** it SHALL be loaded using the height-based key path
