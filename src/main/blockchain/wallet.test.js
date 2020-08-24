import Wallet from './wallet'
import Transaction from './transaction'
import Crypto from '../util/crypto'
import Account from './account'

const fs = require('fs-extra')
const path = require('path')

const { STORE } = require('../config')

describe('Wallet', () => {
  fs.removeSync(path.resolve(STORE.ACCOUNTS))

  let wallet
  beforeEach(() => {
    wallet = new Wallet()
  })

  describe('properties', () => {
    it('has `priaveteKey`, `publicKey`', () => {
      expect(wallet).toHaveProperty('privateKey')
      expect(wallet).toHaveProperty('publicKey')
    })
  })

  describe('persistance', () => {
    describe('instantiating new', () => {
      beforeEach(() => {
        // make sure there is no wallet on disk
        fs.removeSync(path.resolve(STORE.WALLET))
        wallet = wallet.retrieveOrNew()
      })

      it('has `privateKey`, `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(237)
        expect(wallet.publicKey).toHaveLength(174)
      })
    })
    describe('loading from storage', () => {
      beforeEach(() => {
        wallet = wallet.retrieveOrNew()
      })
      it('has `privateKey` and `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(237)
        expect(wallet.publicKey).toHaveLength(174)
      })
      it('reloads the same wallet when called again', () => {
        const wallet2 = new Wallet().retrieveOrNew()
        expect(wallet2.stringify()).toBe(wallet.stringify())
      })
    })
  })

  describe('signing data', () => {
    const data = 'foobuz'

    it('does not verify an invalid signature', () => {
      expect(
        Crypto.verifySignature({
          publicKey: wallet.publicKey,
          data,
          signature: new Wallet().sign(data),
        })
      ).toBe(false)
    })
    it('verifies a signature', () => {
      const signature = wallet.sign(data)
      expect(
        Crypto.verifySignature({
          publicKey: wallet.publicKey,
          data,
          signature,
        })
      ).toBe(true)
    })
    it('verifies a signature by the wallet that was retreived from disk', () => {
      fs.removeSync(path.resolve(STORE.WALLET))
      wallet = new Wallet()
      wallet.store()
      const wallet2 = new Wallet().retrieveOrNew()

      const signature = wallet.sign(data)
      expect(
        Crypto.verifySignature({
          publicKey: wallet2.publicKey,
          data,
          signature,
        })
      ).toBe(true)
    })
  })

  describe('createTransaction()', () => {
    let account
    beforeEach(() => {
      // create account associated with wallet
      account = new Account({
        publicKey: wallet.publicKey,
      }).retrieveOrNew()
      account.balance = 50
      account.store()
    })

    describe('and the amount exceeds the balance', () => {
      it('throws an error', () => {
        const transaction = wallet.createTransaction({ recipient: 'foo-recipient', amount: 999999, fee: 0 })
        expect(() => transaction.validate())
          .toThrow('Amount exceeds balance')
      })
    })

    describe('and the amount + fee exceeds the balance', () => {
      it('throws an error', () => {
        const transaction = wallet.createTransaction({ recipient: 'foo-recipient', amount: 1, fee: 100 })
        expect(() => transaction.validate())
          .toThrow('Amount exceeds balance')
      })
    })

    describe('and the amount is 0', () => {
      it('throws an error', () => {
        const transaction = wallet.createTransaction({ recipient: 'foo-recipient', amount: 0, fee: 0 })
        expect(() => transaction.validate())
          .toThrow('Amount invalid')
      })
    })

    describe('and the amount is < 0', () => {
      it('throws an error', () => {
        const transaction = wallet.createTransaction({ recipient: 'foo-recipient', amount: -12, fee: 0 })
        expect(() => transaction.validate())
          .toThrow('Amount invalid')
      })
    })

    describe('and the fee is < 0', () => {
      it('throws an error', () => {
        const transaction = wallet.createTransaction({ recipient: 'foo-recipient', amount: 0, fee: -12 })
        expect(() => transaction.validate())
          .toThrow('Amount invalid')
      })
    })

    describe('and the amount and fee are valid', () => {
      let transaction,
        amount,
        recipient

      beforeEach(() => {
        amount = 50
        recipient = 'foo-recipient'
        transaction = wallet.createTransaction({ recipient, amount, fee: 0 })
      })

      it('creates an instance of `Transaction`', () => {
        expect(transaction instanceof Transaction).toBe(true)
        expect(transaction.validate()).toBe(true)
      })

      it('matches the transaction sender with the wallet address', () => {
        expect(transaction.sender).toEqual(wallet.publicKey)
        expect(transaction.validate()).toBe(true)
      })
      describe('and the signature is wrong', () => {
        it('throws an error', () => {
          transaction.signature = `.${transaction.signature}`// alter signature
          expect(() => transaction.validate())
            .toThrow('Invalid signature')
        })
      })
    })
  })
})
