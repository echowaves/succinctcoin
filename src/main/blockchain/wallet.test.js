import Wallet from './wallet'
import Account from './account'

const fs = require('fs-extra')
const path = require('path')

const { STORE } = require('../config')

describe('Wallet', () => {
  let wallet
  beforeEach(() => {
    wallet = new Wallet()
  })

  afterAll(() => fs.removeSync(path.resolve(STORE.WALLET)))

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
        // fs.removeSync(path.resolve(STORE.WALLET))
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

  describe('signing transaction', () => {
    let recipient
    let amount
    let fee
    let transaction

    beforeEach(() => {
      recipient = new Wallet().publicKey
      amount = '49'
      fee = '1'
      transaction = wallet.createTransaction({ recipient, amount, fee })
    })

    it('does not verify an invalid signature', () => {
      transaction.signature = 'invalid signature'
      expect(
        transaction.verifySignature()
      ).toBe(false)
    })
    it('verifies a signature', () => {
      expect(
        transaction.verifySignature()
      ).toBe(true)
    })
  })

  describe('wallet.createTransaction()', () => {
    let account
    beforeEach(() => {
      // create account associated with wallet
      account = new Account({
        publicKey: wallet.publicKey,
      }).retrieveOrNew()
      account.balance = 50
      account.store()
    })

    describe('and the amount and fee are valid', () => {
      let transaction,
        amount,
        fee,
        recipient

      beforeEach(() => {
        amount = 49
        fee = amount / 1000
        recipient = new Wallet().publicKey
        transaction = wallet.createTransaction({ recipient, amount, fee })
      })

      it('matches the transaction sender with the wallet address', () => {
        expect(transaction.sender).toEqual(wallet.publicKey)
        expect(transaction.validate()).toBe(true)
      })
    })
  })
})
