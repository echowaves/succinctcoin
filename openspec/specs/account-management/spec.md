## Purpose

Defines account state management including balance and stake operations, persistence, and the total balance calculation.

## Requirements

### Requirement: Account initialization
The system SHALL create a new account with zero balance, zero stake, and the current UTC timestamp for stake creation.

#### Scenario: New account defaults
- **WHEN** an Account is constructed with a public key
- **THEN** balance SHALL be '0', stake SHALL be '0', and stakeTimestamp SHALL be the current UTC epoch time

#### Scenario: Account key derivation
- **WHEN** an Account is constructed
- **THEN** its storage key SHALL be accounts/{SHA512(publicKey)}

### Requirement: Balance operations
The system SHALL allow adding and subtracting from account balances using arbitrary-precision arithmetic.

#### Scenario: Add balance
- **WHEN** addBalance() is called with an amount
- **THEN** the balance SHALL increase by that amount using big.js arithmetic

#### Scenario: Subtract balance
- **WHEN** subtractBalance() is called with an amount less than or equal to the current balance
- **THEN** the balance SHALL decrease by that amount

#### Scenario: Overdraw rejected
- **WHEN** subtractBalance() is called with an amount greater than the current balance
- **THEN** it SHALL throw an error: "trying to substract bigger amount than possible"

### Requirement: Stake operations
The system SHALL allow adding and subtracting from account stakes, with corresponding balance adjustments.

#### Scenario: Add stake
- **WHEN** addStake() is called with an amount
- **THEN** the balance SHALL decrease by that amount, stake SHALL increase by that amount, and stakeTimestamp SHALL be updated to the current UTC time

#### Scenario: Subtract stake
- **WHEN** subtractStake() is called with an amount less than or equal to the current stake
- **THEN** the stake SHALL decrease by that amount, balance SHALL increase by that amount, and stakeTimestamp SHALL be updated

#### Scenario: Over-stake rejected
- **WHEN** subtractStake() is called with an amount greater than the current stake
- **THEN** it SHALL throw an error: "trying to substract bigger amount than possible"

### Requirement: Total balance calculation
The system SHALL provide a method to calculate the total balance including staked funds.

#### Scenario: Calculate total balance
- **WHEN** calculateBalance() is called
- **THEN** it SHALL return the sum of balance and stake (implementation pending)

### Requirement: Account persistence
The system SHALL persist account data to disk and restore it on retrieval.

#### Scenario: Account stored and retrieved
- **WHEN** an account is stored to disk and later retrieved
- **THEN** all fields (publicKey, balance, stake, stakeTimestamp) SHALL be preserved

#### Scenario: Account created if not exists
- **WHEN** retrieveThrough() is called for a non-existent account
- **THEN** a new account SHALL be created and persisted

### Requirement: Custom key assignment
The system SHALL allow setting a custom storage key for an account.

#### Scenario: Set custom hash key
- **WHEN** setHash() is called with a hash value
- **THEN** the account's storage key SHALL be updated to accounts/{hash}
