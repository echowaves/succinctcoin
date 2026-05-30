## Purpose

Defines the cryptographic primitives used throughout SuccinctCoin: hashing, signature verification, and public key validation.

## Requirements

### Requirement: Hash computation
The system SHALL compute SHA512 hashes of arbitrary inputs by JSON-stringifying each input, sorting the resulting strings, joining with a space, and hashing the result.

#### Scenario: Hash single input
- **WHEN** Crypto.hash() is called with a single string argument
- **THEN** it SHALL return a 128-character hexadecimal SHA512 digest

#### Scenario: Hash multiple inputs
- **WHEN** Crypto.hash() is called with multiple arguments
- **THEN** each argument SHALL be JSON-stringified, sorted lexicographically, joined with spaces, and hashed

#### Scenario: Hash is deterministic
- **WHEN** Crypto.hash() is called with the same inputs in different orders
- **THEN** the result SHALL be identical (inputs are sorted before hashing)

### Requirement: Signature verification
The system SHALL verify ECDSA signatures over SHA512-hashed data using a public key.

#### Scenario: Valid signature verified
- **WHEN** Crypto.verifySignature() is called with a public key, data, and a valid signature
- **THEN** it SHALL return true

#### Scenario: Tampered data fails verification
- **WHEN** Crypto.verifySignature() is called with data that differs from what was signed
- **THEN** it SHALL return false

#### Scenario: Wrong public key fails
- **WHEN** Crypto.verifySignature() is called with a public key that does not correspond to the signing key
- **THEN** it SHALL return false

### Requirement: Public key validation
The system SHALL validate that a string is a properly formatted ECDSA public key in SPKI PEM format.

#### Scenario: Valid public key accepted
- **WHEN** Crypto.isPublicKey() is called with a 178-character PEM string starting with "-----BEGIN PUBLIC KEY-----\n" and ending with "\n-----END PUBLIC KEY-----\n"
- **THEN** it SHALL return true

#### Scenario: Invalid public key rejected
- **WHEN** Crypto.isPublicKey() is called with a string that is not 178 characters or lacks proper PEM headers
- **THEN** it SHALL return false

#### Scenario: Null public key rejected
- **WHEN** Crypto.isPublicKey() is called with null or undefined
- **THEN** it SHALL return false
