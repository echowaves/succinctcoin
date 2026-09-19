## MODIFIED Requirements

### Requirement: Reward transaction validation
The system SHALL allow reward transactions where sender is a miner and recipient is *authorized-reward* with exactly 100 coins. The reward is credited to the miner's account as a mint (not deducted from the miner's balance), so no balance check applies.

#### Scenario: Valid reward transaction
- **WHEN** a transaction has recipient=*authorized-reward* and amount=100
- **THEN** validation SHALL succeed without balance checks
- **AND** the 100 coins SHALL be minted to the miner's (sender's) account

#### Scenario: Invalid reward amount rejected
- **WHEN** a reward transaction has amount != 100
- **THEN** validation SHALL reject the transaction

#### Scenario: Reward transaction fee must be zero
- **WHEN** a reward transaction has a non-zero fee
- **THEN** validation SHALL reject the transaction

## MODIFIED Requirements

### Requirement: Stake transaction validation
The system SHALL allow stake transactions where recipient is *authorized-stake* with amount >= 200 and not exceeding 10% of balance, provided the sender's balance is sufficient to cover the stake plus the stake transaction fee.

#### Scenario: Valid stake transaction
- **WHEN** a transaction has recipient=*authorized-stake*, amount >= 200, amount <= 10% of sender balance, and balance >= amount + fee
- **THEN** validation SHALL succeed

#### Scenario: Stake too small rejected
- **WHEN** a stake transaction has amount < 200
- **THEN** validation SHALL reject the transaction

#### Scenario: Zero stake rejected
- **WHEN** a stake transaction has amount = 0
- **THEN** validation SHALL reject the transaction

#### Scenario: Stake exceeds limit rejected
- **WHEN** a stake transaction amount exceeds 10% of sender balance
- **THEN** validation SHALL reject the transaction

#### Scenario: Stake insufficient balance rejected
- **WHEN** a stake transaction amount + fee exceeds sender balance
- **THEN** validation SHALL reject the transaction

## ADDED Requirements

### Requirement: Negative and zero amount validation
The system SHALL reject any transaction with amount <= 0.

#### Scenario: Zero amount rejected
- **WHEN** a transaction has amount = 0
- **THEN** validation SHALL reject the transaction

#### Scenario: Negative amount rejected
- **WHEN** a transaction has a negative amount
- **THEN** validation SHALL reject the transaction
