## MODIFIED Requirements

### Requirement: Transaction form
The system SHALL provide a form for creating transactions with recipient selection and amount input.

#### Scenario: Known addresses loaded
- **WHEN** the ConductTransaction component mounts
- **THEN** it SHALL fetch known addresses from /api/known-addresses and display them for selection

#### Scenario: Transaction submission
- **WHEN** the user fills in recipient and amount and clicks Submit
- **THEN** a POST request SHALL be sent to /api/transact with {recipient: <publicKey>, amount: <number>}; no fee field SHALL be presented to the user

#### Scenario: Transaction result shown
- **WHEN** the transaction API responds
- **THEN** the response message OR type SHALL be shown in an alert dialog

#### Scenario: Amount input validation
- **WHEN** the user submits the transaction form with a non-integer or negative amount
- **THEN** the form SHALL reject the input and NOT send the POST request

## MODIFIED Requirements

### Requirement: Wallet display
The system SHALL display the wallet's public key (address) and account balance.

#### Scenario: Wallet info loaded via IPC
- **WHEN** the Wallet component mounts
- **THEN** it SHALL call ipcRenderer.sendSync('/api/wallet-info') to retrieve the wallet address and account data

#### Scenario: Address and balance rendered
- **WHEN** wallet info is received
- **THEN** the address (public key) and balance SHALL be displayed in the UI

#### Scenario: Wallet balance guards invalid value
- **WHEN** wallet info is received with an undefined or NaN balance
- **THEN** the UI SHALL display a safe value (e.g., 0) instead of showing undefined or NaN

## ADDED Requirements

### Requirement: Empty and short value rendering
The system SHALL render UI safely when the blockchain is empty or block/transaction hashes are short.

#### Scenario: Empty chain shows button
- **WHEN** the Blocks component mounts and the chain contains only the genesis block
- **THEN** it SHALL render a prompt or button encouraging the user to mine transactions

#### Scenario: Short value not truncated
- **WHEN** a hash or value is short enough that truncation would not add meaningful characters
- **THEN** it SHALL be rendered in full without truncation or a dangling "..."

## ADDED Requirements

### Requirement: Amount input validation
The system SHALL validate the amount entered in the transaction form before submitting.

#### Scenario: Non-numeric or empty amount
- **WHEN** the user submits the transaction form with an empty or non-numeric amount
- **THEN** the renderer SHALL reject the submission client-side and not POST an invalid amount
