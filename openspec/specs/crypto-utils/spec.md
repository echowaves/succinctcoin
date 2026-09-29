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

#### Scenario: Hash object inputs deterministically
- **WHEN** Crypto.hash() is called with object inputs whose keys are in different insertion order
- **THEN** the result SHALL be identical (object keys are sorted recursively before hashing)

#### Scenario: Hash with no arguments
- **WHEN** Crypto.hash() is called with no arguments
- **THEN** it SHALL hash the empty input deterministically and return a defined digest

### Requirement: Signature verification
The system SHALL verify ECDSA signatures over SHA512-hashed data using a public key (secp256k1 ECDSA). No malformed input SHALL ever verify: a signature that converts to the expected 64 bytes — a correct-length hex string or a shorter/longer string whose length the hex conversion still rounds to 64 bytes, including non-hex content that coerces to zero bytes — SHALL resolve to `false`, while a signature whose converted length is not 64 bytes, and a `null` or `undefined` signature, SHALL reject (a signature-length error and a `TypeError` from the hex conversion, respectively). Every production path that reaches `Crypto.verifySignature()` funnels through one of three try/catch-wrapped call sites — the chain-validation fold in `Blockchain.isValidChain`, the `addBlock` self/miner path, and the transaction pool's validity filter — so a rejecting signature surfaces as an invalid-transaction/invalid-block validation failure or a filtered-out pool entry, never as an unhandled rejection.

#### Scenario: Valid signature verified
- **WHEN** Crypto.verifySignature() is called with a public key, data, and a valid signature
- **THEN** it SHALL return true

#### Scenario: Tampered data fails verification
- **WHEN** Crypto.verifySignature() is called with data that differs from what was signed
- **THEN** it SHALL return false

#### Scenario: Wrong public key fails
- **WHEN** Crypto.verifySignature() is called with a public key that does not correspond to the signing key
- **THEN** it SHALL return false

#### Scenario: Sixty-four-byte signature is not verified
- **WHEN** Crypto.verifySignature() is called with a signature that converts to 64 bytes — a correct-length hexadecimal signature or a non-hex string whose length the hex conversion still rounds to 64 bytes
- **THEN** it SHALL resolve to false rather than throwing an exception

#### Scenario: Wrong-length and null signatures reject
- **WHEN** Crypto.verifySignature() is called with a signature whose converted length is not 64 bytes, or with a null or undefined signature
- **THEN** the returned promise SHALL reject (a signature-length error, or a TypeError from the hex conversion), and every production path that reaches it SHALL contain that rejection in a try/catch (the chain-validation fold, the addBlock self/miner path, or the pool's validity filter)

### Requirement: Public key validation
The system SHALL validate that a string is a properly formatted secp256k1 public key in hex format: exactly 64, 66, or 130 hex characters, upper- or lowercase, with no leading-prefix constraint (the wallet itself stores 130-character uncompressed public keys; the validity check is length-and-charset only).

#### Scenario: Valid uncompressed public key accepted
- **WHEN** Crypto.isPublicKey() is called with a 130-character hex string (the 04-prefixed uncompressed form used by the wallet)
- **THEN** it SHALL return true

#### Scenario: Valid compressed public key accepted
- **WHEN** Crypto.isPublicKey() is called with a 66-character hex string
- **THEN** it SHALL return true

#### Scenario: Valid raw public key accepted
- **WHEN** Crypto.isPublicKey() is called with a 64-character hex string (raw x,y coordinates)
- **THEN** it SHALL return true

#### Scenario: Uppercase hex accepted
- **WHEN** Crypto.isPublicKey() is called with a 64-, 66-, or 130-character uppercase hex string
- **THEN** it SHALL return true

#### Scenario: Invalid length rejected
- **WHEN** Crypto.isPublicKey() is called with a hex string whose length is not 64, 66, or 130
- **THEN** it SHALL return false

#### Scenario: Non-hex content rejected
- **WHEN** Crypto.isPublicKey() is called with a 64-, 66-, or 130-character string containing any non-hex character
- **THEN** it SHALL return false

#### Scenario: Null or undefined public key rejected
- **WHEN** Crypto.isPublicKey() is called with null or undefined
- **THEN** it SHALL return false
