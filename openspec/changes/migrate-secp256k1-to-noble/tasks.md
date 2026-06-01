# Tasks: Migrate secp256k1 to @noble/secp256k1

## 1. Add helper functions to crypto.js

- [x] 1.1 Add `hexToBytes(hex)` helper: converts hex string to Uint8Array
- [x] 1.2 Add `bytesToHex(bytes)` helper: converts Uint8Array to hex string
- [x] 1.3 Update `isPublicKey()` to check hex format (64 or 130 hex chars)
- [x] 1.4 Update `verifySignature()` to use `ecrypto.verifySync()` with pre-hashed data
- [x] 1.5 Update `crypto.test.js`: fix `isPublicKey` tests for hex format, verify hash test still passes

## 2. Migrate Wallet class to noble

- [x] 2.1 Replace `crypto.generateKeyPairSync` with `ecrypto.randomPrivateKey()` + `ecrypto.getPublicKey()`
- [x] 2.2 Store keys as hex strings (privateKey, publicKey)
- [x] 2.3 Update `sign()` to use `ecrypto.signSync(hash, privateKey)`
- [x] 2.4 Simplify `getPeerId()`: convert hex pub key to bytes directly, remove DER parsing
- [x] 2.5 Remove `_derToUncompressed()` method (no longer needed)
- [x] 2.6 Update `wallet.test.js`: fix key length assertions (237→64, 174→130)
- [x] 2.7 Update `wallet.test.js`: fix `isPublicKey` test if it references PEM format

## 3. Verify and test

- [x] 3.1 Run `npm test` — all tests pass
- [x] 3.2 Run `npm start` — app launches without errors
- [x] 3.3 Verify wallet persists and reloads correctly (same key on restart)
- [x] 3.4 Verify transaction signing and verification works end-to-end

## 4. Verify and test

- [ ] 4.1 Run `npm test` — all tests pass
- [ ] 4.2 Run `npm start` — app launches without errors
- [ ] 4.3 Verify wallet persists and reloads correctly (same key on restart)
- [ ] 4.4 Verify transaction signing and verification works end-to-end
