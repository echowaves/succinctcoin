import Wallet from './wallet'
import Account from './account'

const TransactionPool = require('./transaction-pool')

const Blockchain = require('./index')

describe('TransactionPool', () => {
  let transactionPool,
    transaction,
    senderWallet,
    recipient,
    amount,
    fee,
    account

  beforeEach(() => {
    transactionPool = new TransactionPool()
    senderWallet = new Wallet()
    // create account associated with wallet (sender's account)
    account = new Account({ publicKey: senderWallet.publicKey })
    account.balance = '50'
    account.store()

    recipient = new Wallet().publicKey
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

    beforeEach(() => {
      validTransactions = []
      errorMock = jest.fn()
      global.console.error = errorMock

      for (let i = 0; i < 10; i++) { // eslint-disable-line no-plusplus
        senderWallet = new Wallet()
        recipient = new Wallet().publicKey
        // create account associated with wallet (sender's account)
        account = new Account({ publicKey: senderWallet.publicKey })
        account.balance = '50'
        account.store()

        amount = '29'
        fee = '1'
        transaction = senderWallet.createTransaction({ recipient, amount, fee })

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

    it('returns valid transaction', () => {
      expect(transactionPool.validTransactions()).toEqual(validTransactions)
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
    it('clears the pool of any existing blockchain transactions', () => {
      const blockchain = new Blockchain()
      const expectedTransactionMap = {}

      for (let i = 0; i < 6; i++) { // eslint-disable-line no-plusplus
        senderWallet = new Wallet()
        recipient = new Wallet().publicKey
        // create account associated with wallet (sender's account)
        account = new Account({ publicKey: senderWallet.publicKey })
        account.balance = '50'
        account.store()

        amount = '29'
        fee = '1'
        const transaction = senderWallet.createTransaction({ recipient, amount, fee })

        transactionPool.setTransaction(transaction)

        if (i % 2 === 0) {
          blockchain.addBlock({
            data: [
              transaction,
            ],
            wallet: senderWallet,
          })
        } else {
          expectedTransactionMap[transaction.uuid] = transaction
        }
      }

      transactionPool.clearBlockchainTransactions({ chain: blockchain.chain })

      expect(transactionPool.transactionMap).toEqual(expectedTransactionMap)
    })
  })
})
