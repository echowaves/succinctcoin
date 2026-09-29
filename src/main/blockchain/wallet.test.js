import config from '../config'

import Wallet from './wallet'
import Block from './block'
import deriveState from './state'

const fs = require('fs')
const path = require('path')

// The shared jest fixture for the wallet file (JEST_WORKER_ID -> .test/ root).
// Only this suite writes it, and only from explicit removeWalletFile()/
// writeWalletFile() calls inside its rows — that property keeps the
// parallel-worker layout race-free.
const WALLET_FILE = config.STORE.WALLET

const removeWalletFile = () => {
  if (fs.existsSync(WALLET_FILE)) fs.unlinkSync(WALLET_FILE)
}

const writeWalletFile = content => {
  fs.mkdirSync(path.dirname(WALLET_FILE), { recursive: true })
  fs.writeFileSync(WALLET_FILE, content, 'utf8')
}

// A (privateKey, publicKey) pair the @noble/secp256k1 mock can cross-derive:
// every key in the Wallet constructor is registered in the mock's per-test
// key cache via keygen(), so getPublicKey(privateKey) succeeds for it.
const mockKeyPair = () => {
  const w = new Wallet()
  return { privateKey: w.privateKey, publicKey: w.publicKey }
}

describe('Wallet', () => {
  // afterAll(() => {
  //   fs.removeSync(path.resolve(STORE.WALLET, '..'))
  // })

  let wallet
  beforeEach(() => {
    wallet = new Wallet()
    removeWalletFile()
  })

  describe('properties', () => {
    it('has `priaveteKey`, `publicKey`', () => {
      expect(wallet).toHaveProperty('privateKey')
      expect(wallet).toHaveProperty('publicKey')
    })
  })

  describe('persistance', () => {
    describe('instantiating new', () => {
      beforeEach(async () => {
        // make sure there is no wallet on disk
        // fs.removeSync(path.resolve(STORE.WALLET))
        await wallet.load()
      })

      it('has `privateKey`, `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(64)
        expect(wallet.publicKey).toHaveLength(130)
      })
    })
    describe('loading from storage', () => {
      beforeEach(async () => {
        await wallet.load()
      })
      it('has `privateKey` and `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(64)
        expect(wallet.publicKey).toHaveLength(130)
      })
      it('reloads the same wallet when called again', async () => {
        const pair = mockKeyPair()
        writeWalletFile(JSON.stringify(pair))
        const wallet1 = await new Wallet().load()
        const wallet2 = await new Wallet().load()
        expect(wallet2.stringify()).toBe(wallet1.stringify())
        expect(wallet1.publicKey).toBe(pair.publicKey)
      })
    })
  })

  describe('strict load() (CAP-12 key custody)', () => {
    it('LOAD_FIRST_RUN: no wallet file -> persists the generated keys and returns this', async () => {
      removeWalletFile()
      const loaded = await wallet.load()
      expect(loaded).toBe(wallet)

      const onDisk = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'))
      expect(onDisk).toEqual({
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
      })
    })

    it('LOAD_VALID: a wallet file holding a valid pair installs that identity', async () => {
      const pair = mockKeyPair()
      writeWalletFile(JSON.stringify(pair))
      const loaded = await wallet.load()
      expect(loaded).toBe(wallet)
      expect(wallet.privateKey).toBe(pair.privateKey)
      expect(wallet.publicKey).toBe(pair.publicKey)
    })

    it('LOAD_NOT_JSON: non-JSON content -> typed corrupted-wallet, no assignment', async () => {
      const original = { privateKey: wallet.privateKey, publicKey: wallet.publicKey }
      writeWalletFile('this is not json{')
      await expect(wallet.load()).rejects.toMatchObject({
        code: 'corrupted-wallet',
        name: 'BlockchainError',
        // the fail-fast error names WHICH file: the resolved path is embedded
        message: expect.stringContaining(`${WALLET_FILE} is not valid JSON`),
      })
      expect(wallet.privateKey).toBe(original.privateKey)
      expect(wallet.publicKey).toBe(original.publicKey)
    })

    const badPair = ({ privateKey = 'ab'.repeat(32), publicKey = '04' + 'cd'.repeat(64) } = {}) =>
      JSON.stringify({ privateKey, publicKey })

    it.each([
      ['missing privateKey', () => JSON.stringify({ publicKey: '04' + 'cd'.repeat(64) })],
      ['missing publicKey', () => JSON.stringify({ privateKey: 'ab'.repeat(32) })],
      ['privateKey non-string', () => JSON.stringify({ privateKey: 123, publicKey: '04' + 'cd'.repeat(64) })],
      ['privateKey wrong length', () => badPair({ privateKey: 'ab'.repeat(31) })],
      ['privateKey uppercase hex', () => badPair({ privateKey: 'AB'.repeat(32) })],
      ['publicKey non-string', () => badPair({ publicKey: '0xdead' })],
      ['publicKey missing 04 prefix', () => badPair({ publicKey: '02' + 'cd'.repeat(64) })],
      ['publicKey wrong length', () => badPair({ publicKey: '04' + 'cd'.repeat(63) })],
    ])('LOAD_BAD_SHAPE [shape failure = %s]: no assignment, typed corrupted-wallet', async (_label, content) => {
      const original = { privateKey: wallet.privateKey, publicKey: wallet.publicKey }
      writeWalletFile(content())
      await expect(wallet.load()).rejects.toMatchObject({ code: 'corrupted-wallet' })
      expect(wallet.privateKey).toBe(original.privateKey)
      expect(wallet.publicKey).toBe(original.publicKey)
      expect(wallet.privateKey).toHaveLength(64)
    })

    it('LOAD_BAD_SHAPE [out-of-curve scalar "00"*32]: derivation rejects it -> typed corrupted-wallet, never a raw throw', async () => {
      const original = { privateKey: wallet.privateKey, publicKey: wallet.publicKey }
      writeWalletFile(JSON.stringify({
        privateKey: '00'.repeat(32),
        publicKey: '04' + 'cd'.repeat(64),
      }))
      await expect(wallet.load()).rejects.toMatchObject({
        code: 'corrupted-wallet',
        message: expect.stringContaining('not a usable secp256k1 key'),
      })
      expect(wallet.privateKey).toBe(original.privateKey)
      expect(wallet.publicKey).toBe(original.publicKey)
    })

    // CRITICAL (rli-1/E3): the fixture must be shape-VALID and
    // derivation-divergent. mockKeyPair() supplies a real pair the mock can
    // derive; flipping ONE hex character at index 2 of publicKey breaks the
    // derivation without touching the fixed "04" prefix (index 0 is the "0"
    // of it — flipping that would be a shape failure and the cross-derivation
    // branch would never execute). The stored key stays 130 hex, 04-prefixed.
    it('LOAD_KEY_MISMATCH: a well-shaped pair whose publicKey does not derive from its privateKey -> typed corrupted-wallet, no assignment', async () => {
      const pair = mockKeyPair()
      const atIndex2 = pair.publicKey[2]
      const flipped = (atIndex2 === 'a') ? 'b' : 'a'
      const corruptedPublicKey = pair.publicKey.substring(0, 2) + flipped + pair.publicKey.substring(3)
      expect(corruptedPublicKey).toHaveLength(130)
      expect(corruptedPublicKey.startsWith('04')).toBe(true)
      expect(corruptedPublicKey).not.toBe(pair.publicKey)
      writeWalletFile(JSON.stringify({
        privateKey: pair.privateKey,
        publicKey: corruptedPublicKey,
      }))
      const original = { privateKey: wallet.privateKey, publicKey: wallet.publicKey }
      await expect(wallet.load()).rejects.toMatchObject({
        code: 'corrupted-wallet',
        message: expect.stringContaining('not derivable from privateKey'),
      })
      expect(wallet.privateKey).toBe(original.privateKey)
      expect(wallet.publicKey).toBe(original.publicKey)
    })
  })

  describe('exportBackup() (CAP-12)', () => {
    it('EXPORT_VALID: non-empty string password -> succinctcoin-backup-v1: wire string', () => {
      const backup = wallet.exportBackup('hunter2')
      expect(backup).toMatch(/^succinctcoin-backup-v1:[A-Za-z0-9+/]+={0,2}$/)
      const decoded = Buffer.from(backup.slice('succinctcoin-backup-v1:'.length), 'base64')
      expect(decoded.length).toBeGreaterThanOrEqual(44)
    })

    it.each([
      ['empty string', ''],
      ['undefined', undefined],
      ['number', 42],
      ['null', null],
    ])('EXPORT_BAD_PASSWORD [%s]: typed invalid-backup, no backup string', (_label, password) => {
      expect(() => wallet.exportBackup(password)).toThrow(
        expect.objectContaining({
          name: 'BlockchainError',
          code: 'invalid-backup',
          message: 'Backup password must be a non-empty string',
        }),
      )
    })
  })

  describe('restoreBackup() (CAP-12)', () => {
    // RESTORE_SAME_KEY is a REAL wipe (rli-1/E4): wallet A first installs
    // its identity via a first-run load() (the file exists on disk — a
    // genuine persisted identity), then the file is deleted, then a fresh
    // wallet B restores from the backup.
    it('RESTORE_SAME_KEY: export -> wipe -> restore on a fresh wallet yields the same identity and a durable file', async () => {
      removeWalletFile()
      const walletA = new Wallet()
      await walletA.load() // first-run path persists A's identity
      expect(fs.existsSync(WALLET_FILE)).toBe(true)

      const backup = walletA.exportBackup('seal-the-deal')
      removeWalletFile() // the real wipe

      const walletB = new Wallet()
      expect(walletB.publicKey).not.toBe(walletA.publicKey) // genuinely fresh keys
      const restored = walletB.restoreBackup(backup, 'seal-the-deal')

      expect(restored).toBe(walletB)
      expect(walletB.publicKey).toBe(walletA.publicKey)
      expect(walletB.privateKey).toBe(walletA.privateKey)

      // rli-1: the restored identity is DURABLE and byte-format-clean —
      // exactly the HOC-`store()` content (no `key` property leaks).
      const onDisk = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'))
      expect(onDisk).toEqual({
        privateKey: walletA.privateKey,
        publicKey: walletA.publicKey,
      })

      // the restart: a fresh strict load() on the restored file installs
      // the SAME identity (it neither fails nor re-generates) — the CAP-12
      // "export → wipe → restore → restart" cycle is the recovery itself
      const walletC = await new Wallet().load()
      expect(walletC.privateKey).toBe(walletA.privateKey)
      expect(walletC.publicKey).toBe(walletA.publicKey)
    })

    it('RESTORE_WRONG_PASSWORD: a valid backup with a different password -> typed invalid-backup, keys unchanged', async () => {
      const backup = wallet.exportBackup('right-password')
      const other = new Wallet()
      const original = { privateKey: other.privateKey, publicKey: other.publicKey }
      expect(() => other.restoreBackup(backup, 'wrong-password'))
        .toThrow(expect.objectContaining({ name: 'BlockchainError', code: 'invalid-backup' }))
      expect(other.privateKey).toBe(original.privateKey)
      expect(other.publicKey).toBe(original.publicKey)
      expect(fs.existsSync(WALLET_FILE)).toBe(false) // no persist on failure
    })

    // RESTORE_TAMPERED (rli-1/B10): two flips in the base64 BODY — one at
    // ~45% (ciphertext region, mid-flip to a valid base64 alphabet char)
    // and one at the LAST char (auth-tag region). Both must be typed.
    it.each([
      ['~45% (ciphertext region)', 'ciphertext'],
      ['last char (auth-tag region)', 'tag'],
    ])(
      'RESTORE_TAMPERED [%s]: typed invalid-backup, no assignment',
      (_label, region) => {
        const backup = wallet.exportBackup('tamper-me')
        const prefixLength = 'succinctcoin-backup-v1:'.length
        const body = backup.slice(prefixLength)
        const index = region === 'tag'
          ? body.length - 1
          : Math.floor(body.length * 0.45)
        const flippedChar = (body[index] === 'A') ? 'B' : 'A'
        const tampered = body.substring(0, index) + flippedChar + body.substring(index + 1)
        expect(tampered).not.toBe(body)
        // no base64-validity re-assert here: flipping a trailing "=" padding
        // char (which the tag-region flip genuinely does, ~1/3 of envelopes)
        // makes the body base64-invalid, and that is ALSO a typed
        // invalid-backup — the row pins "typed failure + no assignment"
        // either way, without masking which branch failed

        const fresh = new Wallet()
        const original = { privateKey: fresh.privateKey, publicKey: fresh.publicKey }
        // the CORRECT password: the failure must come from the backup, not
        // the password assertion
        expect(() => fresh.restoreBackup(`succinctcoin-backup-v1:${tampered}`, 'tamper-me'))
          .toThrow(expect.objectContaining({ name: 'BlockchainError', code: 'invalid-backup' }))
        expect(fresh.privateKey).toBe(original.privateKey)
        expect(fresh.publicKey).toBe(original.publicKey)
      },
    )

    // A malformed payload envelope is hand-built exactly per the wire spec
    // (scrypt + aes-256-gcm, random salt/iv, same prefix) so the row
    // exercises the PAYLOAD validation branches (version / shape), not the
    // decode or decrypt branches.
    const cryptoLib = require('crypto')
    const buildEnvelope = (payloadBody, password = 'envelope-password') => {
      const salt = cryptoLib.randomBytes(16)
      const iv = cryptoLib.randomBytes(12)
      const key = cryptoLib.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 })
      const cipher = cryptoLib.createCipheriv('aes-256-gcm', key, iv)
      const ciphertext = Buffer.concat([cipher.update(payloadBody, 'utf8'), cipher.final()])
      const tag = cipher.getAuthTag()
      return `succinctcoin-backup-v1:${Buffer.concat([salt, iv, ciphertext, tag]).toString('base64')}`
    }

    it.each([
      ['wrong prefix', w => `${w.exportBackup('x')}`.replace('succinctcoin-backup-v1:', 'succinctcoin-backup-v0:'), 'x'],
      ['non-string backup (number)', () => 42, 'x'],
      ['non-string backup (null)', () => null, 'x'],
      ['invalid base64', () => 'succinctcoin-backup-v1:not@valid!base64$$$', 'x'],
      ['truncated (decoded < 44 bytes)', () => `succinctcoin-backup-v1:${Buffer.alloc(32).toString('base64')}`, 'x'],
      ['empty body (nothing after the prefix)', () => 'succinctcoin-backup-v1:', 'x'],
      ['mangled body (flipped prefix char)', w => {
        const backup = w.exportBackup('mangle-me')
        return backup.replace('succinctcoin', 'succinctc0in')
      }, 'mangle-me'],
      ['payload v: 2', () => buildEnvelope(JSON.stringify({
        v: 2,
        privateKey: 'ab'.repeat(32),
        publicKey: '04' + 'cd'.repeat(64),
      })), 'envelope-password'],
      ['payload null', () => buildEnvelope('null'), 'envelope-password'],
      ['payload {}', () => buildEnvelope('{}'), 'envelope-password'],
      ['payload []', () => buildEnvelope('[]'), 'envelope-password'],
    ])('RESTORE_MALFORMED [%s]: typed invalid-backup, no assignment', (_label, makeBackup, password) => {
      const fresh = new Wallet()
      const original = { privateKey: fresh.privateKey, publicKey: fresh.publicKey }
      const backup = makeBackup(new Wallet())
      expect(() => fresh.restoreBackup(backup, password))
        .toThrow(expect.objectContaining({ code: 'invalid-backup', name: 'BlockchainError' }))
      expect(fresh.privateKey).toBe(original.privateKey)
      expect(fresh.publicKey).toBe(original.publicKey)
    })

    // A shape-valid but derivation-divergent pair carried INSIDE a valid
    // authenticated envelope: the failure must be the pair validation
    // (the LOAD_KEY_MISMATCH branch through the wire), not decode/decrypt.
    it('RESTORE_MALFORMED [shape-valid, derivation-divergent pair]: typed invalid-backup, no assignment, no persist', () => {
      const pair = mockKeyPair()
      const flipped = (pair.publicKey[2] === 'a') ? 'b' : 'a'
      const divergentPublicKey = pair.publicKey.substring(0, 2) + flipped + pair.publicKey.substring(3)
      // v: 1 — the version check must pass so this row reaches the PAIR
      // validation branch (a v: 2 payload would fail at the version check)
      const backup = buildEnvelope(JSON.stringify({
        v: 1,
        privateKey: pair.privateKey,
        publicKey: divergentPublicKey,
      }))
      const fresh = new Wallet()
      const freshKeys = { privateKey: fresh.privateKey, publicKey: fresh.publicKey }

      expect(() => fresh.restoreBackup(backup, 'envelope-password'))
        .toThrow(expect.objectContaining({
          code: 'invalid-backup',
          message: expect.stringContaining('key pair is invalid'),
        }))
      expect(fresh.privateKey).toBe(freshKeys.privateKey)
      expect(fresh.publicKey).toBe(freshKeys.publicKey)
      expect(fs.existsSync(WALLET_FILE)).toBe(false)
    })

    it('RESTORE_MALFORMED [payload v: 2] additionally pins: the wallet keeps its constructor keys (no assignment, rli-1/E5)', () => {
      const fresh = new Wallet()
      const freshKeys = { privateKey: fresh.privateKey, publicKey: fresh.publicKey }
      const backup = buildEnvelope(JSON.stringify({
        v: 2,
        privateKey: 'ab'.repeat(32),
        publicKey: '04' + 'cd'.repeat(64),
      }))
      expect(() => fresh.restoreBackup(backup, 'envelope-password'))
        .toThrow(expect.objectContaining({ code: 'invalid-backup' }))
      expect(fresh.privateKey).toBe(freshKeys.privateKey)
      expect(fresh.publicKey).toBe(freshKeys.publicKey)
      expect(fs.existsSync(WALLET_FILE)).toBe(false)
    })
  })

  describe('signing transaction', () => {
    let recipient
    let amount
    let fee
    let transaction

    beforeEach(async () => {
      recipient = new Wallet().publicKey
      amount = '49'
      fee = '1'
      transaction = await wallet.createTransaction({ recipient, amount, fee })
       })

    it('does not verify an invalid signature', async () => {
      transaction.signature = 'invalid signature'
      expect(
        await transaction.verifySignature(),
       ).toBe(false)
        })
    it('verifies a signature', async () => {
      expect(
        await await transaction.verifySignature(),
      ).toBe(true)
    })
  })

  describe('wallet.createTransaction()', () => {
    let state
    beforeEach(async () => {
      // fund the sender via a mined reward block; validation checks the
      // balance against the derived chain state (AD-10), never disk
      const block = await new Block({ lastBlock: Block.genesis(), data: [] }).mineBlock({ wallet })

      state = deriveState([Block.genesis(), block])
    })

    describe('and the amount and fee are valid', () => {
      let transaction,
        amount,
        fee,
        recipient

beforeEach(async () => {
          amount = 49
          fee = amount / 1000
          recipient = new Wallet().publicKey
          transaction = await wallet.createTransaction({ recipient, amount, fee })
      })

      it('matches the transaction sender with the wallet address', async () => {
        expect(transaction.sender).toEqual(wallet.publicKey)
        expect(await transaction.validate({ state })).toBe(true)
      })
    })
  })
})
