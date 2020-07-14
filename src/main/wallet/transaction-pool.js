const Transaction = require('./transaction')

class TransactionPool {
  constructor() {
    this.transactionMap = {}
  }

  clear() {
    this.transactionMap = {}
  }

  setTransaction(transaction) {
    this.transactionMap[transaction.id] = transaction
  }

  setMap(transactionMap) {
    this.transactionMap = transactionMap
  }

  existingTransaction({ inputAddress }) {
    const transactions = Object.values(this.transactionMap)

    return transactions.find(transaction => transaction.input.address === inputAddress)
  }

  validTransactions() {
    return Object.values(this.transactionMap).filter(
      transaction => Transaction.validTransaction(transaction)
    )
  }

  clearBlockchainTransactions({ chain }) {
    for (let i = 1; i < chain.length; i++) { // eslint-disable-line no-plusplus
      const block = chain[i]

      for (const transaction of block.data) { // eslint-disable-line no-restricted-syntax
        if (this.transactionMap[transaction.id]) {
          delete this.transactionMap[transaction.id]
        }
      }
    }
  }
}

module.exports = TransactionPool
