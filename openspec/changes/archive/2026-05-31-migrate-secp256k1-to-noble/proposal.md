# Migrate secp256k1 to @noble/secp256k1

## Why

Electron bundles its own build of OpenSSL that strips out the `secp256k1` curve (not used in web TLS). This causes the app to crash on startup:

```
Error: error:0f00007b:elliptic curve routines:OPENSSL_internal:UNKNOWN_GROUP
    at Object.generateKeyPairSync (node:internal/crypto/keygen:120:63)
    at new Wallet (...)
```

The `@noble/secp256k1` package is already installed as a transitive dependency and provides a pure-JS implementation that works in any JS environment.

## What Changes

- Replace Node.js `crypto` module usage for EC key generation/signing/verification with `@noble/secp256k1`
- Migrate key format from PEM (SPKI/PKCS8) to raw hex
- Update all affected modules: `Wallet`, `Crypto` utility, and their tests

## What Does Not Change

- Transaction format and signature semantics (same data hashed, same ECDSA algorithm)
- Public key identity (hex is just a different encoding of the same curve point)
- API endpoints, UI, P2P protocol, blockchain logic
- No new dependencies (noble is already installed)

## Impact

| File | Change |
|------|--------|
| `src/main/blockchain/wallet.js` | Replace `crypto.generateKeyPairSync` with noble `ecrypto.randomPrivateKey` + `ecrypto.getPublicKey`; replace `crypto.createSign` with noble `ecrypto.signSync` |
| `src/main/util/crypto.js` | Replace `crypto.createVerify` with noble `ecrypto.verifySync`; update `isPublicKey` to check hex format |
| `src/main/blockchain/wallet.test.js` | Update key length assertions (237→66, 174→65) |
| `src/main/util/crypto.test.js` | Update `isPublicKey` tests for hex format |

## Schema

spec-driven
