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
        wallet = wallet.retrieveOrNew(STORE.WALLET)
      })

      it('has `privateKey`, `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(237)
        expect(wallet.publicKey).toHaveLength(174)
      })
    })
    describe('loading from storage', () => {
      beforeEach(() => {
        wallet = wallet.retrieveOrNew(STORE.WALLET)
      })
      it('has `privateKey` and `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(237)
        expect(wallet.publicKey).toHaveLength(174)
      })
      it('reloads the same wallet when called again', () => {
        const wallet2 = new Wallet().retrieveOrNew(STORE.WALLET)
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
      wallet.store(STORE.WALLET)
      const wallet2 = new Wallet().retrieveOrNew(STORE.WALLET)

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

  // it('has a `balance`', () => {
  //   expect(wallet).toHaveProperty('balance')
  // })
  //
  // it('has a `publicKey`', () => {
  //   expect(wallet).toHaveProperty('publicKey')
  // })
  //
  // describe('signing data', () => {
  //   const data = 'foobar'
  //
  //   it('verifies a signature', () => {
  //     expect(
  //       Crypto.verifySignature({
  //         publicKey: wallet.publicKey,
  //         data,
  //         signature: wallet.sign(data),
  //       })
  //     ).toBe(true)
  //   })
  //   it('verifies a signature regardless of the order of parameters', () => {
  //   })
  //
  //   it('does not verify an invalid signature', () => {
  //     expect(
  //       Crypto.verifySignature({
  //         publicKey: wallet.publicKey,
  //         data,
  //         signature: new Wallet().sign(data),
  //       })
  //     ).toBe(false)
  //   })
  // })
  //
  describe('createTransaction()', () => {
    let account
    beforeEach(() => {
      // create account associated to wallet
      account = new Account({
        publicKey: wallet.publicKey,
      }).retrieveOrNew(path.join(STORE.ACCOUNTS, Crypto.hash(wallet.publicKey)))
      account.balance = 50
      account.store(path.join(STORE.ACCOUNTS, Crypto.hash(wallet.publicKey)))
    })

    describe('and the amount exceeds the balance', () => {
      it('throws an error', () => {
        expect(() => wallet.createTransaction({ recipient: 'foo-recipient', amount: 999999, fee: 0 }))
          .toThrow('Amount exceeds balance')
      })
    })

    describe('and the amount + fee exceeds the balance', () => {
      it('throws an error', () => {
        expect(() => wallet.createTransaction({ recipient: 'foo-recipient', amount: 1, fee: 100 }))
          .toThrow('Amount exceeds balance')
      })
    })

    describe('and the amount is 0', () => {
      it('throws an error', () => {
        expect(() => wallet.createTransaction({ recipient: 'foo-recipient', amount: 0, fee: 0 }))
          .toThrow('Amount invalid')
      })
    })

    describe('and the amount is < 0', () => {
      it('throws an error', () => {
        expect(() => wallet.createTransaction({ recipient: 'foo-recipient', amount: -12, fee: 0 }))
          .toThrow('Amount invalid')
      })
    })

    describe('and the fee is < 0', () => {
      it('throws an error', () => {
        expect(() => wallet.createTransaction({ recipient: 'foo-recipient', amount: 0, fee: -12 }))
          .toThrow('Amount invalid')
      })
    })

    describe('and the amount is valid', () => {
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
      })

      it('matches the transaction sender with the wallet address', () => {
        expect(transaction.sender).toEqual(wallet.publicKey)
      })
    })
  })

  // describe('calculateBalance()', () => {
  //   let blockchain
  //
  //   beforeEach(() => {
  //     blockchain = new Blockchain()
  //   })
  //
  //   describe('and there are no outputs for the wallet', () => {
  //     it('returns the `STARTING_BALANCE`', () => {
  //       expect(
  //         Wallet.calculateBalance({
  //           chain: blockchain.chain,
  //           address: wallet.publicKey,
  //         })
  //       ).toEqual(STARTING_BALANCE)
  //     })
  //   })
  //
  //   describe('and there are outputs for the wallet', () => {
  //     let transactionOne,
  //       transactionTwo
  //
  //     beforeEach(() => {
  //       transactionOne = new Wallet().createTransaction({
  //         recipient: wallet.publicKey,
  //         amount: 50,
  //       })
  //
  //       transactionTwo = new Wallet().createTransaction({
  //         recipient: wallet.publicKey,
  //         amount: 60,
  //       })
  //
  //       blockchain.addBlock({
  //         data: [
  //           transactionOne, transactionTwo,
  //         ],
  //       })
  //     })
  //
  //     it('adds the sum of all outputs to the wallet balance', () => {
  //       expect(
  //         Wallet.calculateBalance({
  //           chain: blockchain.chain,
  //           address: wallet.publicKey,
  //         })
  //       ).toEqual(
  //         STARTING_BALANCE
  //         + transactionOne.outputMap[wallet.publicKey]
  //         + transactionTwo.outputMap[wallet.publicKey]
  //       )
  //     })
  //
  //     describe('and the wallet has made a transaction', () => {
  //       let recentTransaction
  //
  //       beforeEach(() => {
  //         recentTransaction = wallet.createTransaction({
  //           recipient: 'foo-address',
  //           amount: 30,
  //         })
  //
  //         blockchain.addBlock({
  //           data: [
  //             recentTransaction,
  //           ],
  //         })
  //       })
  //
  //       it('returns the output amount of the recent transaction', () => {
  //         expect(
  //           Wallet.calculateBalance({
  //             chain: blockchain.chain,
  //             address: wallet.publicKey,
  //           })
  //         ).toEqual(recentTransaction.outputMap[wallet.publicKey])
  //       })
  //
  //       describe('and there are outputs next to and after the recent transaction', () => {
  //         let sameBlockTransaction,
  //           nextBlockTransaction
  //
  //         beforeEach(() => {
  //           recentTransaction = wallet.createTransaction({
  //             recipient: 'later-foo-address',
  //             amount: 60,
  //           })
  //
  //           sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet })
  //
  //           blockchain.addBlock({
  //             data: [
  //               recentTransaction, sameBlockTransaction,
  //             ],
  //           })
  //
  //           nextBlockTransaction = new Wallet().createTransaction({
  //             recipient: wallet.publicKey, amount: 75,
  //           })
  //
  //           blockchain.addBlock({
  //             data: [
  //               nextBlockTransaction,
  //             ],
  //           })
  //         })
  //
  //         it('includes the output amounts in the returned balance', () => {
  //           expect(
  //             Wallet.calculateBalance({
  //               chain: blockchain.chain,
  //               address: wallet.publicKey,
  //             })
  //           ).toEqual(
  //             recentTransaction.outputMap[wallet.publicKey]
  //             + sameBlockTransaction.outputMap[wallet.publicKey]
  //             + nextBlockTransaction.outputMap[wallet.publicKey]
  //           )
  //         })
  //       })
  //     })
  //   })
  // })
})
