## Purpose

Defines wallet key management, transaction signing, and the wallet's role as the primary identity and signing authority in SuccinctCoin.

## Requirements

### Requirement: Key pair generation
The system SHALL generate an ECDSA key pair using the prime256v1 curve when a new wallet is created.

#### Scenario: New wallet has valid keys
- **WHEN** a new Wallet instance is created
- **THEN** it SHALL have a 178-character PEM-encoded public key and a corresponding private key

#### Scenario: Keys are unique per wallet
- **WHEN** two wallets are created independently
- **THEN** their public keys SHALL be different

### Requirement: Transaction signing
The system SHALL sign transaction data using SHA512 hash followed by ECDSA signature with the wallet's private key.

#### Scenario: Sign transaction data
- **WHEN** a wallet signs [uuid, timestamp, sender, recipient, amount, fee]
- **THEN** the signature SHALL be verifiable using the wallet's public key

#### Scenario: Tampered data fails verification
- **WHEN** transaction data is modified after signing
- **THEN** signature verification SHALL fail

### Requirement: Transaction creation
The system SHALL create transactions with sender, recipient, amount, fee, and sign them with the wallet's private key.

#### Scenario: Create standard transaction
- **WHEN** a wallet creates a transaction with recipient, amount, and fee
- **THEN** the transaction SHALL have sender=wallet.publicKey, a valid UUID, timestamp, and a valid signature

#### Scenario: Create reward transaction
- **WHEN** a wallet creates a reward transaction
- **THEN** the transaction SHALL have recipient=*authorized-reward*, amount=100, sender=wallet.publicKey, fee=0

#### Scenario: Create stake transaction
- **WHEN** a wallet creates a stake transaction with amount and fee
- **THEN** the transaction SHALL have recipient=*authorized-stake* and the specified amount

### Requirement: Wallet persistence
The system SHALL persist wallet key pairs to disk and restore them across application restarts.

#### Scenario: Wallet saved and restored
- **WHEN** a wallet is stored to disk and later retrieved
- **THEN** the restored wallet SHALL have the same public and private keys

#### Scenario: Wallet path
- **WHEN** a wallet is persisted
- **THEN** it SHALL be stored at ~/.succinctcoin/wallet (or .test/wallet in dev mode)

### Requirement: Account association
The system SHALL retrieve or create an account associated with the wallet's public key.

#### Scenario: Get existing account
- **WHEN** getAccount() is called and an account exists for the wallet's public key
- **THEN** the existing account SHALL be returned

#### Scenario: Create account if missing
- **WHEN** getAccount() is called and no account exists for the wallet's public key
- **THEN** a new account SHALL be created and returned
