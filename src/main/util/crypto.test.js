import Wallet from '../blockchain/wallet'

import Crypto from './crypto'

describe('Crypto', () => {
  describe('Crypto.hash()', () => {
    it('generates a SHA-512 hashed output', () => {
      expect(Crypto.hash('foo'))
        .toEqual('7822850fecc31ad84d42bc4dfad785dc1ba286202e19271979763f9c39aba48156a3374d8f483b0a7f0dd5d1b044d4452fba5d8495501f7bcf526db1ad1691f3')
    })

    it('produces the same hash with the same input arguments in any order', () => {
      expect(Crypto.hash('one', 'two', 'three'))
        .toEqual(Crypto.hash('three', 'one', 'two'))
    })

    it('produces a unique hash when the properties have changed on an input', () => {
      const foo = {}
      const originalHash = Crypto.hash(foo)
      foo.a = 'a'

      expect(Crypto.hash(foo)).not.toEqual(originalHash)
    })

    it('produces the same hash for objects differing only in nested key order', () => {
      expect(Crypto.hash({ a: 1, b: { c: 2, d: 3 } }))
        .toEqual(Crypto.hash({ b: { d: 3, c: 2 }, a: 1 }))
    })

    it('produces the same hash for arrays of objects differing only in key order', () => {
      expect(Crypto.hash([{ z: 1, a: 2 }]))
        .toEqual(Crypto.hash([{ a: 2, z: 1 }]))
    })

    it('produces different hashes when array element order differs', () => {
      expect(Crypto.hash([1, 2])).not.toEqual(Crypto.hash([2, 1]))
    })

    it('respects toJSON so Date inputs hash like their ISO string form', () => {
      const x = 1700000000000
      expect(Crypto.hash({ d: new Date(x) }))
        .toEqual(Crypto.hash({ d: new Date(x).toISOString() }))
    })

    it('drops undefined properties as JSON.stringify does', () => {
      expect(Crypto.hash({ a: 1, b: undefined }))
        .toEqual(Crypto.hash({ a: 1 }))
    })

    it('pins the canonical hash of an object input (byte-identical for already-canonical objects)', () => {
      expect(Crypto.hash({ a: 1, b: { c: 2, d: 3 } }))
        .toEqual('1d327edd068e091991684a8f4493dcf7c56dfcfcb7a5bee3eadedcacdb5058374964b6d7d734998fc012b49adbe67c6c7945eeab84251c9c7bc2c5fa5c18a338')
    })

    it('pins the canonical hash of a block-shaped multi-input call (locks the space-join)', () => {
      expect(Crypto.hash(0, 'u', 0, 'm', 'l', [{ a: 1 }]))
        .toEqual('dc83dc8c45860940dbff2938c7c87866c539a1183e4c43fc8302d407805411cb45786734be97464ff1f2ebf62e8cde3fb98e40e350256dff478935d367eaf9d0')
    })

    it('composes key-order invariance and element-order sensitivity in arrays of objects', () => {
      expect(Crypto.hash([{ z: 1, a: 2 }, { y: 3, b: 4 }]))
        .toEqual(Crypto.hash([{ a: 2, z: 1 }, { b: 4, y: 3 }]))
      expect(Crypto.hash([{ z: 1, a: 2 }, { y: 3, b: 4 }]))
        .not.toEqual(Crypto.hash([{ y: 3, b: 4 }, { z: 1, a: 2 }]))
    })
  })

  describe('Crypto.isPublicKey()', () => {
    let wallet
    beforeEach(async () => {
      wallet = new Wallet()
      await wallet.retrieveThrough()
    })
    it('returns `true` when key is valid hex', () => {
      expect(Crypto.isPublicKey({ publicKey: wallet.publicKey })).toBe(true)
    })
    it('returns `false` when length is not correct', () => {
      expect(Crypto.isPublicKey({ publicKey: 'ab' })).toBe(false)
      expect(Crypto.isPublicKey({ publicKey: 'ab'.repeat(31) })).toBe(false)
    })
    it('returns `false` when key contains non-hex characters', () => {
      expect(Crypto.isPublicKey({ publicKey: 'gg' + wallet.publicKey.substring(2) })).toBe(false)
      expect(Crypto.isPublicKey({ publicKey: wallet.publicKey + 'zz' })).toBe(false)
    })
    it('returns `false` for empty or null values', () => {
      expect(Crypto.isPublicKey({ publicKey: '' })).toBe(false)
      expect(Crypto.isPublicKey({ publicKey: null })).toBe(false)
      expect(Crypto.isPublicKey({ publicKey: undefined })).toBe(false)
      expect(Crypto.isPublicKey({})).toBe(false)
    })
  })
})
