## ADDED Requirements

### Requirement: Wallet backup and recovery
The system SHALL support backing up and restoring wallet keys so that key loss does not result in irreversible fund loss.

#### Scenario: Encrypted seed backup
- **WHEN** the user creates a backup
- **THEN** the wallet SHALL produce an encrypted seed/backup that can restore the wallet

#### Scenario: Restore from backup
- **WHEN** a backup is restored
- **THEN** the restored wallet SHALL have the same public and private keys

#### Scenario: Corrupted wallet file
- **WHEN** the wallet file at ~/.succinctcoin/wallet is corrupted or partially written
- **THEN** the application SHALL detect the corruption, avoid crashing, and report a recoverable error (and continue running if a backup is available)

## MODIFIED Requirements

### Requirement: Transaction signing
The system SHALL sign transaction data using SHA512 hash followed by ECDSA signature with the wallet's private key, using a fixed signature serialization (hex-encoded).

#### Scenario: Sign transaction data
- **WHEN** a wallet signs [uuid, timestamp, sender, recipient, amount, fee]
- **THEN** the signature SHALL be encoded as a fixed-length hex string and be verifiable using the wallet's public key

#### Scenario: Tampered data fails verification
- **WHEN** transaction data is modified after signing
- **THEN** signature verification SHALL fail
