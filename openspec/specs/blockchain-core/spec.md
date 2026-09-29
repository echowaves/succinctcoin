## Purpose

Defines the core blockchain data structure, canonical block contents, block validation rules, chain consensus (strictly-longer replacement plus deterministic equal-length fork resolution), and persistence for SuccinctCoin.

## Requirements

### Requirement: Genesis block initialization
The system SHALL initialize the blockchain with a single genesis block containing the canonical predefined values (height 0, uuid="GENESIS", timestamp=0, validator="GENESIS", lastHash="GENESIS", hash="GENESIS", data=["GENESIS"], signature="GENESIS"). The genesis definition in configuration/spec.md is authoritative.

#### Scenario: New blockchain starts with genesis
- **WHEN** a new Blockchain instance is created
- **THEN** the chain SHALL contain exactly one block (the genesis block) with height 0, uuid="GENESIS", and the canonical genesis values

#### Scenario: Genesis block is immutable
- **WHEN** a block claims to be at height 0 with any field (uuid, validator, lastHash, hash, data, signature) different from the canonical genesis
- **THEN** chain validation SHALL reject the chain as invalid

### Requirement: Block mining
The system SHALL mine a new block by creating a reward transaction, ordering all block transactions canonically, computing the SHA512 hash of the canonical block contents, and signing the hash with the miner's private key. Mining eligibility is a separate app-semantic concern: each node self-evaluates the fixed-odds lottery against its own chain head on an autonomous re-check interval (see transaction-miner/spec.md); the mining primitive itself imposes no selection rule.

The canonical content form is pinned: the block hash is the SHA512 digest, hex-encoded, of the hash input `(height, uuid, timestamp, miner, lastHash, data)` with exactly this field set — adding or removing a field is a consensus-breaking change. `data` is the block's transaction multiset in the deterministic total order (timestamp ASC, then uuid ASC); the same enumeration applies to the transaction signature inputs. The reward transaction's timestamp is the block's timestamp.

#### Scenario: Successful block mining
- **WHEN** a wallet mines a block on top of the chain with a set of transactions
- **THEN** the block SHALL contain exactly one reward transaction (100 coins to the miner, zero fee), SHALL contain every input transaction, SHALL order data in (timestamp ASC, uuid ASC) order, SHALL have a timestamp equal to the reward transaction's timestamp, a valid SHA512 hash over the pinned field set, and the miner's ECDSA signature over that hash

#### Scenario: Block height increments
- **WHEN** a new block is mined on top of the chain
- **THEN** the block height SHALL equal the previous block's height plus 1

#### Scenario: Block links to previous
- **WHEN** a new block is mined
- **THEN** the block's lastHash SHALL equal the previous block's hash

#### Scenario: Identical contents hash identically
- **WHEN** two blocks carry the same height, uuid, timestamp, miner, lastHash, and the same transaction multiset in any order
- **THEN** after canonical (timestamp ASC, uuid ASC) ordering their hashes SHALL be identical

### Requirement: Block validation
The system SHALL validate each block by checking that it is not the genesis block, that its data is non-empty, that a block above height 3 does not contain only a reward transaction (mining an empty pool is a validation failure there but not in the earliest blocks), that it contains exactly one reward transaction, that no transaction UUIDs are duplicated, that its height links to its parent, that its timestamp rules hold, that its data is in the canonical order, that its miner is a valid public key, that every transaction passes validation against the running state derived from the chain, and that its hash and signature are intact.

#### Scenario: Valid block passes validation
- **WHEN** a block has the correct SHA512 hash over the pinned field set, a valid signature, canonically ordered transactions, and exactly one reward transaction (100 coins, zero fee, sharing the block timestamp)
- **THEN** validation SHALL succeed

#### Scenario: Duplicate transactions rejected
- **WHEN** a block contains two transactions with the same UUID
- **THEN** validation SHALL reject the block

#### Scenario: Multiple reward transactions rejected
- **WHEN** a block contains more than one reward transaction
- **THEN** validation SHALL reject the block

#### Scenario: Missing reward transaction rejected
- **WHEN** a block contains no reward transaction
- **THEN** validation SHALL reject the block

#### Scenario: Invalid hash rejected
- **WHEN** a block's hash does not match the SHA512 digest of its contents in the canonical order
- **THEN** validation SHALL reject the block

#### Scenario: Invalid signature rejected
- **WHEN** a block's signature does not verify under the miner's public key
- **THEN** validation SHALL reject the block

#### Scenario: Non-canonical data order rejected
- **WHEN** a block's transactions are not in (timestamp ASC, uuid ASC) order
- **THEN** validation SHALL reject the block

#### Scenario: Reward-only block above height 3 rejected
- **WHEN** a block at height > 3 contains only a reward transaction
- **THEN** validation SHALL reject the block, regardless of whether the source node mined it with an empty pool

#### Scenario: Invalid miner rejected
- **WHEN** a block's miner field is not a valid public key
- **THEN** validation SHALL reject the block

#### Scenario: User transaction may not post-date its block
- **WHEN** any non-reward transaction's timestamp is strictly greater than the block's timestamp
- **THEN** validation SHALL reject the block, while equality SHALL be permitted

#### Scenario: Reward transaction must share the block timestamp
- **WHEN** the reward transaction's timestamp differs from the block's timestamp
- **THEN** validation SHALL reject the block

#### Scenario: Transactions validated against running derived state
- **WHEN** a block's transactions are validated in order against the chain-derived running state, advancing the state as each transaction is applied
- **THEN** any transaction that fails validation against the running state at its position (for example a user transfer whose sender lacks the derived balance) SHALL cause the block to be rejected

### Requirement: Chain validation
The system SHALL validate an entire chain by checking genesis block correctness, then validating each subsequent block sequentially against the running state derived from the accepted prefix, advancing the state only when a block validates.

#### Scenario: Valid chain accepted
- **WHEN** all blocks in the chain pass individual validation and link correctly
- **THEN** the chain SHALL be considered valid

#### Scenario: Broken chain link rejected
- **WHEN** a block's lastHash does not match the preceding block's hash
- **THEN** the chain SHALL be considered invalid

#### Scenario: Invalid genesis rejected
- **WHEN** the first block in a chain does not match the canonical genesis block
- **THEN** the chain SHALL be considered invalid

#### Scenario: State-carrying fold rejects chains each block alone would pass
- **WHEN** every block in a chain passes validation in isolation but a later block's transactions cannot be funded by the chain-derived running state at that position
- **THEN** the chain SHALL be considered invalid

### Requirement: Chain replacement (consensus)
The system SHALL replace its current chain with an incoming chain only when the incoming chain is valid and strictly longer. Equal-length incoming chains SHALL be resolved deterministically: at the first block whose hash differs (the divergence point), the node SHALL adopt the incoming chain only when its hash there is lower than the local chain's, reject it when higher, and treat an incoming chain identical to the local one as a no-op. A shorter incoming chain SHALL be rejected in all cases. No node's state is canonical over another's.

#### Scenario: Longer valid chain replaces current
- **WHEN** a peer broadcasts a chain longer than the local chain AND the chain is valid
- **THEN** the local chain SHALL be replaced with the incoming chain

#### Scenario: Equal-length lower-hash chain adopted
- **WHEN** a peer broadcasts a valid chain of the same length as the local chain AND the incoming chain's hash at the first divergence point is lower than the local chain's
- **THEN** the local chain SHALL be replaced with the incoming lower-hash chain

#### Scenario: Equal-length higher-hash chain rejected
- **WHEN** a peer broadcasts a valid chain of the same length as the local chain AND the incoming chain's hash at the first divergence point is higher than the local chain's
- **THEN** the local chain SHALL remain unchanged

#### Scenario: Identical chain is a no-op
- **WHEN** a peer broadcasts a chain identical to the local chain (equal length, every hash equal)
- **THEN** the local chain SHALL remain unchanged

#### Scenario: Shorter chain ignored
- **WHEN** a peer broadcasts a chain shorter than the local chain
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
