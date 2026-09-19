## MODIFIED Requirements

### Requirement: Total balance calculation
The system SHALL provide a method to calculate the total balance including staked funds. The result is the big.js sum of balance and stake.

#### Scenario: Calculate total balance
- **WHEN** calculateBalance() is called
- **THEN** it SHALL return the sum of balance and stake as a big.js value (balance + stake)
