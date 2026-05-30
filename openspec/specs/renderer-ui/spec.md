## Purpose

Defines the React renderer UI components, routing, and user interaction patterns for the SuccinctCoin desktop application.

## Requirements

### Requirement: Application routing
The system SHALL provide a HashRouter-based navigation with Wallet, About, and Users routes.

#### Scenario: Default route shows wallet
- **WHEN** the application loads without a hash fragment
- **THEN** the Wallet component SHALL be rendered

#### Scenario: About route is a stub
- **WHEN** the user navigates to /about
- **THEN** a placeholder About component SHALL be rendered

#### Scenario: Users route is a stub
- **WHEN** the user navigates to /users
- **THEN** a placeholder Users component SHALL be rendered

### Requirement: Wallet display
The system SHALL display the wallet's public key (address) and account balance.

#### Scenario: Wallet info loaded via IPC
- **WHEN** the Wallet component mounts
- **THEN** it SHALL call ipcRenderer.sendSync('/api/wallet-info') to retrieve the wallet address and account data

#### Scenario: Address and balance rendered
- **WHEN** wallet info is received
- **THEN** the address (public key) and balance SHALL be displayed in the UI

### Requirement: Transaction form
The system SHALL provide a form for creating transactions with recipient selection and amount input.

#### Scenario: Known addresses loaded
- **WHEN** the ConductTransaction component mounts
- **THEN** it SHALL fetch known addresses from /api/known-addresses and display them for selection

#### Scenario: Transaction submission
- **WHEN** the user fills in recipient and amount and clicks Submit
- **THEN** a POST request SHALL be sent to /api/transact with {recipient: <publicKey>, amount: <number>}

#### Scenario: Transaction result shown
- **WHEN** the transaction API responds
- **THEN** the response message OR type SHALL be shown in an alert dialog

### Requirement: Block listing with pagination
The system SHALL display blocks in pages of 5 with clickable page number buttons.

#### Scenario: Blocks loaded on mount
- **WHEN** the Blocks component mounts
- **THEN** it SHALL fetch the chain length from /api/blocks/length and load the first page of blocks

#### Scenario: Page navigation
- **WHEN** the user clicks a page number button
- **THEN** the corresponding page of blocks SHALL be fetched from /api/blocks/:id and displayed

#### Scenario: Pagination buttons generated
- **WHEN** the chain length is known
- **THEN** Math.ceil(length / 5) page buttons SHALL be rendered

### Requirement: Transaction pool viewer
The system SHALL display pending transactions with automatic polling and a manual mine button.

#### Scenario: Pool loaded on mount
- **WHEN** the TransactionPool component mounts
- **THEN** it SHALL fetch the transaction pool map from /api/transaction-pool-map

#### Scenario: Pool auto-refresh
- **WHEN** the TransactionPool component is mounted
- **THEN** it SHALL poll /api/transaction-pool-map every 10 seconds

#### Scenario: Pool cleanup on unmount
- **WHEN** the TransactionPool component unmounts
- **THEN** the polling interval SHALL be cleared

#### Scenario: Mine transactions button
- **WHEN** the user clicks "Mine the Transactions" button
- **THEN** a request SHALL be sent to /api/mine-transactions and the user SHALL be alerted on success or failure

### Requirement: Block detail display
The system SHALL display block hash and timestamp with expandable transaction details.

#### Scenario: Block hash displayed
- **WHEN** a Block component renders
- **THEN** it SHALL show the first 15 characters of the hash followed by "..."

#### Scenario: Block timestamp displayed
- **WHEN** a Block component renders
- **THEN** it SHALL show the timestamp as a localized date/time string

#### Scenario: Transactions expandable
- **WHEN** the user clicks "Show More" on a block
- **THEN** all transactions in that block SHALL be displayed with their details

#### Scenario: Transaction data truncated
- **WHEN** a block's transaction data stringified length exceeds 35 characters
- **THEN** it SHALL be truncated to 35 characters with "..." appended

### Requirement: Transaction detail display
The system SHALL display transaction sender, recipient, amount, and fee.

#### Scenario: Sender displayed as hash
- **WHEN** a Transaction component renders
- **THEN** it SHALL show the first 30 characters of the sender's public key hash followed by "..."

#### Scenario: Recipient displayed as hash
- **WHEN** a Transaction component renders
- **THEN** it SHALL show the first 30 characters of the recipient's public key hash followed by "..."

#### Scenario: Amount and fee displayed
- **WHEN** a Transaction component renders
- **THEN** it SHALL show the amount and fee values
