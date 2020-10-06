import Wallet from './wallet'
import Account from './account'

import TransactionPool from './transaction-pool'

import Blockchain from './index'

describe('TransactionPool', () => {
  let transactionPool,
    transaction,
    senderWallet,
    recipient,
    amount,
    fee,
    account

  beforeEach(async () => {
    transactionPool = new TransactionPool()
    senderWallet = new Wallet()
    // create account associated with wallet (sender's account)
    account = new Account({ publicKey: senderWallet.publicKey })
    account.balance = '5000'
    await account.store()

    recipient = new Wallet().publicKey
    new Account({ publicKey: recipient }).store()

    amount = '49'
    fee = '1'

    transaction = senderWallet.createTransaction({ recipient, amount, fee })
  })

  describe('setTransaction()', () => {
    it('adds a transaction', () => {
      transactionPool.setTransaction(transaction)

      expect(transactionPool.transactionMap[transaction.uuid])
        .toBe(transaction)
    })
  })

  describe('existingTransaction()', () => {
    it('returns an existing transaction given an input address', () => {
      transactionPool.setTransaction(transaction)

      expect(
        transactionPool.existingTransaction({ sender: senderWallet.publicKey })
      ).toBe(transaction)
    })
  })

  describe('validTransactions()', () => {
    let validTransactions,
      errorMock

    beforeEach(async () => {
      validTransactions = []
      errorMock = jest.fn()
      global.console.error = errorMock

      for (let i = 0; i < 10; i += 1) {
        senderWallet = new Wallet()
        recipient = new Wallet().publicKey
        // create account associated with wallet (sender's account)
        account = new Account({ publicKey: senderWallet.publicKey })
        account.balance = '50'
        await account.store() // eslint-disable-line no-await-in-loop

        amount = '29'
        fee = '1'
        const transaction = senderWallet.createTransaction({ recipient, amount, fee })

        if (i % 3 === 0) {
          transaction.amount = 999999
        } else if (i % 3 === 1) {
          transaction.signature = `.${transaction.signature}`// alter signature
        } else {
          validTransactions.push(transaction)
        }
        transactionPool.setTransaction(transaction)
      }
    })

    it('returns valid transaction', async () => {
      expect(await transactionPool.validTransactions()).toEqual(validTransactions)
    })

    // it('logs errors for the invalid transactions', () => {
    //   transactionPool.validTransactions()
    //   expect(errorMock).toHaveBeenCalled()
    // })
  })

  describe('clear()', () => {
    it('clears the transactions', () => {
      transactionPool.clear()

      expect(transactionPool.transactionMap).toEqual({})
    })
  })

  describe('clearBlockchainTransactions()', () => {
    it('clears the pool of any existing blockchain transactions', async () => {
      const blockchain = new Blockchain()

      senderWallet = new Wallet()
      const account = new Account({ publicKey: senderWallet.publicKey })
      account.balance = '5000'
      await account.store()

      // first 3 reward bootstrap blocks
      blockchain.addBlock({ data: [], wallet: senderWallet })
      blockchain.addBlock({ data: [], wallet: senderWallet })
      blockchain.addBlock({ data: [], wallet: senderWallet })

      amount = '29'
      fee = '1'
      const transaction = senderWallet.createTransaction({ recipient, amount, fee })

      transactionPool.setTransaction(transaction)
      expect(Object.values(transactionPool.transactionMap)).toHaveLength(1)

      const block = blockchain.addBlock({
        data: [
          transaction,
        ],
        wallet: senderWallet,
      })
      if (block) {
        transactionPool.clearBlockchainTransactions({ block })
      }
      expect(Object.values(transactionPool.transactionMap)).toHaveLength(0)
    })
  })
})
