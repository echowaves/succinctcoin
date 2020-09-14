class TransactionPool {
  constructor() {
    this.clear()
  }

  clear() {
    this.transactionMap = {}
  }

  setTransaction(transaction) {
    this.transactionMap[transaction.uuid] = transaction
  }

  setMap(transactionMap) {
    this.transactionMap = transactionMap
  }

  existingTransaction({ sender }) {
    const transactions = Object.values(this.transactionMap)

    return transactions.find(transaction => transaction.sender === sender)
  }

  validTransactions() {
    return Object.values(this.transactionMap).filter(
      transaction => {
        try {
          return transaction.validate()
        } catch (error) {
          return false
        }
      }
    )
  }

  clearBlockchainTransactions({ chain }) {
    for (let i = 1; i < chain.length; i++) { // eslint-disable-line no-plusplus
      const block = chain[i]

      for (const transaction of block.data) { // eslint-disable-line no-restricted-syntax
        if (this.transactionMap[transaction.uuid]) {
          delete this.transactionMap[transaction.uuid]
        }
      }
    }
  }
}

export default TransactionPool
