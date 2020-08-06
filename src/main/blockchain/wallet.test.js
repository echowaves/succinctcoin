import Wallet from './wallet'
import Crypto from '../util/crypto'

const fs = require('fs-extra')
const path = require('path')

const { STORE } = require('../config')

describe('Wallet', () => {
  let wallet
  beforeEach(() => {
    wallet = new Wallet()
  })

  describe('properties', () => {
    it('has `priaveteKey`, `publicKey`, `keyPair`', () => {
      expect(wallet).toHaveProperty('privateKey')
      expect(wallet).toHaveProperty('publicKey')
      expect(wallet).toHaveProperty('keyPair')
    })
  })

  describe('persistance', () => {
    describe('instantiating new', () => {
      beforeEach(() => {
        // make sure there is no wallet on disk
        fs.removeSync(path.resolve(STORE.WALLET))
        wallet = wallet.retrieveOrNew(STORE.WALLET)
      })

      it('has `privateKey`, `publicKey`, keyPair that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(64)
        expect(wallet.publicKey).toHaveLength(130)
        expect(wallet.keyPair instanceof Object).toBeTruthy()
      })
    })
    describe('loading from storage', () => {
      beforeEach(() => {
        wallet = wallet.retrieveOrNew(STORE.WALLET)
      })
      it('has `privateKey` and `publicKey` that are not empty', () => {
        expect(wallet.privateKey).toHaveLength(64)
        expect(wallet.publicKey).toHaveLength(130)
        expect(wallet.keyPair instanceof Object).toBeTruthy()
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
      console.log(wallet.keyPair)
      wallet = wallet.retrieveOrNew(STORE.WALLET)
      console.log(wallet.keyPair)

      const signature = wallet.sign(data)
      expect(
        Crypto.verifySignature({
          publicKey: wallet.publicKey,
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
  // describe('createTransaction()', () => {
  //   describe('and the amount exceeds the balance', () => {
  //     it('throws an error', () => {
  //       expect(() => wallet.createTransaction({ amount: 999999, recipient: 'foo-recipient' }))
  //         .toThrow('Amount exceeds balance')
  //     })
  //   })
  //
  //   describe('and the amount is valid', () => {
  //     let transaction,
  //       amount,
  //       recipient
  //
  //     beforeEach(() => {
  //       amount = 50
  //       recipient = 'foo-recipient'
  //       transaction = wallet.createTransaction({ amount, recipient })
  //     })
  //
  //     it('creates an instance of `Transaction`', () => {
  //       expect(transaction instanceof Transaction).toBe(true)
  //     })
  //
  //     it('matches the transaction input with the wallet', () => {
  //       expect(transaction.input.address).toEqual(wallet.publicKey)
  //     })
  //
  //     it('outputs the amount the recipient', () => {
  //       expect(transaction.outputMap[recipient]).toEqual(amount)
  //     })
  //   })
  //
  //   describe('and a chain is passed', () => {
  //     it('calls `Wallet.calculateBalance`', () => {
  //       const calculateBalanceMock = jest.fn()
  //
  //       const originalCalculateBalance = Wallet.calculateBalance
  //
  //       Wallet.calculateBalance = calculateBalanceMock
  //
  //       wallet.createTransaction({
  //         recipient: 'foo',
  //         amount: 10,
  //         chain: new Blockchain().chain,
  //       })
  //
  //       expect(calculateBalanceMock).toHaveBeenCalled()
  //
  //       Wallet.calculateBalance = originalCalculateBalance
  //     })
  //   })
  // })
  //
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
