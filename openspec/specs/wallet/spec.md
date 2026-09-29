## Purpose

Defines wallet key management, transaction signing, and the wallet's role as the primary identity and signing authority in SuccinctCoin.

## Requirements

### Requirement: Key pair generation
The system SHALL generate an secp256k1 ECDSA key pair at runtime when a new wallet is constructed, storing both keys as lowercase hex strings: a 64-character private key and a 130-character public key (04-prefixed uncompressed coordinates). No key material is read from disk at construction; the key pair the wallet holds is what `load()` (see "Wallet persistence") may later replace only from a verified file.

#### Scenario: New wallet has valid keys
- **WHEN** a new Wallet instance is created
- **THEN** it SHALL have a 130-character 04-prefixed hex public key and a 64-character hex private key from which that public key is derivable

#### Scenario: Keys are unique per wallet
- **WHEN** two wallets are created independently
- **THEN** their public keys SHALL be different

### Requirement: Transaction signing
The system SHALL sign transaction data by computing the canonical hash of the pinned field array (see AD-12: the same enumeration as block `data`) — `[uuid, timestamp, sender, recipient, amount, fee]`, with amount and fee normalized through big.js — then producing an ECDSA signature over the SHA512 digest with the wallet's private key, hex-encoded.

#### Scenario: Sign transaction data
- **WHEN** a wallet signs the pinned field array [uuid, timestamp, sender, recipient, amount, fee]
- **THEN** the signature SHALL be a hex string and SHALL verify against the wallet's public key over the canonical hash of the same field array

#### Scenario: Tampered data fails verification
- **WHEN** transaction data is modified after signing
- **THEN** signature verification SHALL fail

#### Scenario: Field order is canonical
- **WHEN** the signature inputs and the verification inputs enumerate the same field values in the same canonical order
- **THEN** the signature SHALL verify, and any divergence in field values or order SHALL fail verification

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
The system SHALL persist wallet key pairs to a single file under the application's storage root and restore them across application restarts through a strict load: a missing file means first run (the constructor-generated key pair is persisted and returned); a present file is read, parsed, shape-checked, and cross-derived (the public key must derive from the private key), and ANY failure fails fast with a typed `corrupted-wallet` error before any key is assigned — a corrupt file never falls back to a fresh identity. Exactly one wallet file exists per app instance, and only that instance's load/restore paths write it; test runs isolate it under `.test/` solely when `JEST_WORKER_ID` is set (never dev mode). Export and restore cross the IPC surface only: `/api/wallet-export` and `/api/wallet-restore` answer synchronously (see api-endpoints/spec.md), and a successful restore persists the recovered identity back to the wallet file so it survives a restart.

#### Scenario: Wallet saved and restored
- **WHEN** a wallet is stored to disk and later loaded at startup
- **THEN** the loaded wallet SHALL have the same public and private keys

#### Scenario: Corrupt wallet file fails fast
- **WHEN** the wallet file exists but is unreadable, non-JSON, misshapen, or its public key does not derive from its private key
- **THEN** the load SHALL throw a typed `corrupted-wallet` error and the wallet SHALL NOT use a fresh identity

#### Scenario: Wallet path
- **WHEN** a wallet is persisted
- **THEN** it SHALL be stored at ~/.succinctcoin/wallet in normal operation, and under .test/wallet only while a test worker (JEST_WORKER_ID set) runs

### Requirement: Wallet backup and recovery
The system SHALL encrypt the wallet key pair for backup and restore it, so that key loss does not result in irreversible fund loss.

#### Scenario: Encrypted backup
- **WHEN** the user creates a backup with a non-empty password
- **THEN** the wallet SHALL produce a `succinctcoin-backup-v1:`-prefixed string that is base64 of salt ‖ iv ‖ ciphertext ‖ 16-byte auth tag, where the `{ v: 1, privateKey, publicKey }` payload is encrypted with aes-256-gcm under a key derived from the password with scrypt

#### Scenario: Restore from backup
- **WHEN** a backup is restored with the password it was exported with
- **THEN** the restored wallet SHALL have the same public and private keys, the restored identity SHALL be written to the wallet file (so it survives a restart), and a wrong password, a tampered backup, or a malformed backup SHALL yield a typed `invalid-backup` error without changing the wallet's identity

#### Scenario: Corrupted wallet file
- **WHEN** the wallet file at ~/.succinctcoin/wallet is corrupted (non-JSON, badly shaped, or a key pair that fails cross-derivation)
- **THEN** loading the wallet SHALL fail fast with a typed `corrupted-wallet` error and SHALL NOT use a fresh identity, and recovery SHALL be an explicit restore of a previously created backup

### Requirement: Account association
The system SHALL retrieve or create an account associated with the wallet's public key.

#### Scenario: Get existing account
- **WHEN** getAccount() is called and an account exists for the wallet's public key
- **THEN** the existing account SHALL be returned

#### Scenario: Create account if missing
- **WHEN** getAccount() is called and no account exists for the wallet's public key
- **THEN** a new account SHALL be created and returned
