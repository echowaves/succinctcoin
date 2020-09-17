import Transaction from './transaction'

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
    console.error(this.transactionMap)
    return Object.values(this.transactionMap).filter(
      transaction => {
        try {
          const t = new Transaction().parse(JSON.stringify(transaction))
          // const t = new Transaction().parse(transaction.toString())
          console.error(t.constructor.name)
          return t.validate()
        } catch (error) {
          console.error(error)
          return false
        }
      }
    )
  }

  clearBlockchainTransactions({ block }) {
    for (const transaction of block.data) { // eslint-disable-line no-restricted-syntax
      if (this.transactionMap[transaction.uuid]) {
        delete this.transactionMap[transaction.uuid]
      }
    }
  }
}

export default TransactionPool
