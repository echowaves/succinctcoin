## MODIFIED Requirements

### Requirement: Create transaction
The system SHALL create a signed transaction, validate it, add it to the pool, broadcast it, and return the result. The fee SHALL be automatically calculated as amount / 1000 (0.1%) in big.js arithmetic — the client SHALL NOT supply a fee.

#### Scenario: Successful transaction
- **WHEN** POST /api/transact is called with a valid recipient and amount
- **THEN** the system SHALL create a transaction with auto-calculated fee (amount/1000), validate it, add it to the pool, broadcast it to peers, and return {type: 'success', transaction}

#### Scenario: Invalid transaction rejected
- **WHEN** POST /api/transact is called with invalid data (e.g., insufficient balance)
- **THEN** the system SHALL return {type: 'error', message: <error message>} with HTTP 400 status

#### Scenario: Fee auto-calculated
- **WHEN** a transaction is created via /api/transact
- **THEN** the fee SHALL be automatically calculated as amount / 1000 (0.1%), using big.js; the client SHALL NOT be able to supply a fee

## ADDED Requirements

### Requirement: Amount validation
The system SHALL validate the amount on the create-transaction endpoint and reject non-integer, negative, or unsafe values before creating a transaction.

#### Scenario: Non-integer amount rejected
- **WHEN** POST /api/transact is called with a non-integer amount
- **THEN** the response SHALL return {type: 'error', message: <error message>} with HTTP 400 status

#### Scenario: Negative amount rejected
- **WHEN** POST /api/transact is called with a negative amount
- **THEN** the response SHALL return {type: 'error', message: <error message>} with HTTP 400 status

## ADDED Requirements

### Requirement: Non-400 failure responses
The system SHALL return appropriate non-400 HTTP statuses for failure conditions that are not validation errors.

#### Scenario: Server failure returns 500
- **WHEN** a transaction creation fails due to an unexpected server-side error
- **THEN** the response SHALL return {type: 'error', message: <error message>} with HTTP 500 status

#### Scenario: Missing wallet returns 401/403
- **WHEN** a request that requires a wallet is made when no wallet is loaded
- **THEN** the response SHALL return {type: 'error', message: <error message>} with HTTP 401 or 403 status
