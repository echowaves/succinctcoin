import Wallet from './wallet'
import Account from './account'

// const fs = require('fs-extra')
// const path = require('path')
//
// const { STORE } = require('../config')

describe('Wallet', () => {
  // afterAll(() => {
  //   fs.removeSync(path.resolve(STORE.WALLET, '..'))
  // })

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
      beforeEach(async () => {
        // make sure there is no wallet on disk
        // fs.removeSync(path.resolve(STORE.WALLET))
        await wallet.retrieveThrough()
      })

      it('has `privateKey`, `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(241)
        expect(wallet.publicKey).toHaveLength(178)
      })
    })
    describe('loading from storage', () => {
      beforeEach(async () => {
        await wallet.retrieveThrough()
      })
      it('has `privateKey` and `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(241)
        expect(wallet.publicKey).toHaveLength(178)
      })
      it('reloads the same wallet when called again', async () => {
        const wallet2 = await new Wallet().retrieveThrough()
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
    beforeEach(async () => {
      // create account associated with wallet
      account = await (new Account({ publicKey: wallet.publicKey })).retrieveThrough()

      account.balance = 50
      await account.store()
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

      it('matches the transaction sender with the wallet address', async () => {
        expect(transaction.sender).toEqual(wallet.publicKey)
        expect(await transaction.validate()).toBe(true)
      })
    })
  })
})
