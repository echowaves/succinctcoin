## Purpose

Defines the autonomous, lottery-gated transaction mining process: an app-owned re-check interval on which each node self-evaluates the pinned lottery against its own chain head, and — only as a winner — turns valid pending pool transactions into a new block.

## Requirements

### Requirement: Autonomous lottery-gated mining
The system SHALL mine autonomously: after the API layer starts the miner at startup, the miner SHALL re-check its eligibility on an app-semantic interval (a liveness value owned by the app configuration, distinct from the core validation rate), and each re-check SHALL self-evaluate the pinned fixed-odds lottery against the local chain head and the node's own public key. On the autonomous path a node SHALL mine a new block only when it is the lottery winner for the next block (the development-only endpoint below triggers one immediate mine without consulting the lottery and is not the autonomous path). Every node runs the identical self-evaluation on the identical inputs, so eligibility is peer-invariant and requires no coordination; simultaneous winners simply produce same-height forks that are resolved by the chain-replacement rules.

The HTTP endpoint `GET /api/mine-transactions` is a development-only convenience that triggers one immediate mine; on non-development builds the route is not registered. It is not the mining path.

#### Scenario: Miner runs on an interval without external triggers
- **WHEN** the miner is started at API initialization
- **THEN** it SHALL evaluate lottery eligibility against the local chain head periodically on the app-semantic re-check interval, with no request, broadcast, or other node required to trigger a mine

#### Scenario: A non-winner does not mine
- **WHEN** the re-check fires and the node's self-evaluated lottery against the current head does not win
- **THEN** no block SHALL be created for that check

#### Scenario: A winner mines one block per eligible check
- **WHEN** the re-check fires and the node is the lottery winner for the next block
- **THEN** the node SHALL create and add exactly one block for that check, and a check that fires while a mine is already in flight SHALL not start another

#### Scenario: Autonomous start and stop
- **WHEN** the miner is started a second time while already running, or stopped when already stopped
- **THEN** at most one re-check interval SHALL be armed at any time

#### Scenario: Dev convenience endpoint triggers one mine
- **WHEN** `GET /api/mine-transactions` is called on a development build
- **THEN** one immediate mine SHALL run (lottery not consulted) and the response SHALL redirect to /api/blocks; on a non-development build the route SHALL NOT be registered

### Requirement: Pool validity filtering against derived state
Before mining a winning block, the system SHALL filter the transaction pool against the state derived from the current chain and include only transactions that pass full validation against that derived state, so that funding decisions are a pure function of chain contents and intra-block double-spends are caught against the pre-block state.

#### Scenario: Only valid transactions mined
- **WHEN** a winning block is mined from a pool containing valid and invalid transactions
- **THEN** only the transactions that pass validation against the derived chain state SHALL be included in the new block

#### Scenario: Underfunded transactions excluded
- **WHEN** a pooled transaction's sender lacks sufficient derived balance to cover amount plus fee
- **THEN** it SHALL NOT be included in the next block

#### Scenario: Reward-only block when no valid transactions
- **WHEN** a node wins the lottery and the pool contains no valid transaction
- **THEN** the block SHALL contain only the reward transaction (such blocks are valid at heights the validator permits; see blockchain-core/spec.md)

### Requirement: Post-mine broadcast and cleanup
After a block is successfully created, the system SHALL broadcast the updated chain to peers and clear the mined transactions from the pool. A failed mine SHALL complete without crashing and SHALL NOT broadcast or clear the pool.

#### Scenario: Mined block broadcast
- **WHEN** a block is successfully mined
- **THEN** the updated chain SHALL be broadcast to peers

#### Scenario: Mined transactions cleared
- **WHEN** a block is successfully mined
- **THEN** all transactions included in that block SHALL be removed from the transaction pool

#### Scenario: Failed mine leaves pool intact
- **WHEN** block creation fails for a winning check
- **THEN** the miner SHALL NOT broadcast, SHALL NOT clear the pool, and subsequent re-checks SHALL continue

#### Scenario: Reward credited to miner
- **WHEN** a block is mined
- **THEN** the reward transaction within it SHALL be credited to the block's miner as a mint in the derived chain state
