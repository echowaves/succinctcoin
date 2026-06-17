# Design: Migrate secp256k1 to @noble/secp256k1

## Current Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Wallet Class                       │
│                                                      │
│  constructor() ──▶ crypto.generateKeyPairSync('ec',   │
│                    { namedCurve: 'secp256k1' })       │
│                    returns PEM (SPKI/PKCS8)            │
│                                                      │
│  sign(data) ────▶ crypto.createSign('SHA512')        │
│                   .sign(privateKey, 'hex')            │
│                                                      │
│  getPeerId() ───▶ crypto.createPublicKey(publicKey)  │
│                   .export({ type: 'spki', format: 'der' })
│                   ──▶ DER parsing ──▶ raw bytes       │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│              Crypto Utility                           │
│                                                      │
│  verifySignature({ publicKey, data, signature })     │
│    ──▶ crypto.createVerify('SHA512')                │
│         .verify(publicKey, signature, 'hex')         │
│                                                      │
│  isPublicKey({ publicKey })                          │
│    ──▶ checks PEM format (174/178 chars)            │
└─────────────────────────────────────────────────────┘
```

Key format: PEM-encoded
- Public key: SPKI PEM, ~174 characters
- Private key: PKCS8 PEM, ~237 characters

## Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Wallet Class                       │
│                                                      │
│  constructor() ──▶ ecrypto.randomPrivateKey()         │
│                   ──▶ ecrypto.getPublicKey(privKey)   │
│                   returns raw hex                      │
│                                                      │
│  sign(data) ────▶ ecrypto.signSync(                   │
│                     hash, privateKey                  │
│                   )                                   │
│                   returns hex string                  │
│                                                      │
│  getPeerId() ───▶ this.publicKey (hex)               │
│                   ──▶ hexToBytes ──▶ raw bytes       │
└─────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│              Crypto Utility                           │
│                                                      │
│  verifySignature({ publicKey, data, signature })     │
│    ──▶ ecrypto.verifySync(                           │
│          hash, signature, publicKey                  │
│        )                                              │
│                                                      │
│  isPublicKey({ publicKey })                          │
│    ──▶ checks hex format (64 or 130 chars)          │
└─────────────────────────────────────────────────────┘
```

Key format: raw hex
- Public key: uncompressed 65 bytes → 130 hex chars (04 + 32 bytes x + 32 bytes y)
- Private key: 32 bytes → 64 hex chars

## Key Decisions

### 1. Use raw hex, not PEM

**Decision**: Keys stored as hex strings.

**Rationale**:
- Noble's API works natively with bytes/hex
- PEM encoding was a Node.js convenience with no semantic value
- Hex is the natural representation for secp256k1 keys
- Simpler code, no DER parsing/conversion overhead
- `getPeerId()` becomes trivial: hex → bytes, no SPKI header stripping

**Tradeoffs**:
- Public key string changes from ~174 chars to 130 chars
- UI displays different format (but same identity)
- No migration needed (app not launched)

### 2. Keep SHA-512 for signing

**Decision**: Continue using SHA-512 as the hash function for ECDSA signing.

**Rationale**:
- Transaction signature semantics must remain consistent
- Noble supports arbitrary hash functions via the third parameter
- Changing the hash would be an unnecessary breaking change

### 3. Noble import pattern

**Decision**: Use dynamic `import()` for `@noble/secp256k1` (same pattern already used for `@libp2p/crypto/keys`).

**Rationale**:
- Works with Jest's CJS environment (Babel transforms to Promise-based require)
- Consistent with existing codebase patterns
- Avoids ESM/CJS interop issues

### 4. Signature format

**Decision**: Keep signatures as hex strings.

**Rationale**:
- Noble's `signSync` returns a signature object with `r` and `s` BigInts
- We'll serialize to hex (concatenated r + s, each 64 hex chars = 128 hex chars)
- `verifySync` accepts hex signatures natively
- Transaction `signature` field remains a hex string — no format change for consumers

## Noble API Mapping

| Node.js crypto | @noble/secp256k1 | Notes |
|----------------|------------------|-------|
| `generateKeyPairSync('ec', { namedCurve: 'secp256k1' })` | `randomPrivateKey()` + `getPublicKey(privKey, false)` | false = uncompressed |
| `createSign('SHA512').write(data).sign(privateKey, 'hex')` | `signSync(hash, privateKey)` | hash is pre-computed SHA-512 |
| `createVerify('SHA512').write(data).verify(publicKey, sig, 'hex')` | `verifySync(hash, sig, publicKey)` | hash is pre-computed SHA-512 |

## Helper Functions

Need two small helpers in `crypto.js`:

```js
// hex string (64 chars) → Uint8Array (32 bytes)
function hexToBytes(hex) { ... }

// Uint8Array (65 bytes, uncompressed) → hex string (130 chars)
function bytesToHex(bytes) { ... }
```

## Impact on Existing Code

### Wallet class
- `constructor()`: Replace key generation, store hex keys
- `sign()`: Pre-hash data, call `signSync`, return hex
- `transactionSignature()`: No change (calls `sign()`)
- `getPeerId()`: Convert hex pub key to bytes directly, skip DER parsing
- `createTransaction()`, `createRewardTransaction()`, `createStakeTransaction()`: No change (call `transactionSignature()`)
- `getAccount()`: No change (passes `this.publicKey` as hex)

### Crypto utility
- `verifySignature()`: Pre-hash data, call `verifySync`
- `isPublicKey()`: Check for hex format (64 or 130 chars, all hex digits)
- `hash()`: No change (uses SHA-512, not EC)

### Transaction class
- `verifySignature()`: No change (calls `Crypto.verifySignature()` with same params)
- `validate()`: No change (calls `Crypto.isPublicKey()` — just checks different format)

### Account class
- No change (stores `publicKey` as-is, uses `Crypto.hash()`)

### Tests
- `wallet.test.js`: Update key length assertions (237→64, 174→130)
- `crypto.test.js`: Update `isPublicKey` tests for hex format

## Risks

| Risk | Mitigation |
|------|-----------|
| Noble signature format differs from Node's DER-encoded format | Noble returns DER-encoded signature as hex by default — same format as Node.js `sign(sig, 'hex')` |
| `verifySync` expects pre-hashed data | We already pre-hash with SHA-512 in current code |
| Noble import fails in Jest | Using `import()` pattern already proven with libp2p |
