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
    return Object.values(this.transactionMap).filter(
      transaction => {
        try {
          const t = new Transaction().parse(JSON.stringify(transaction))
          // const t = new Transaction().parse(transaction.toString())
          return t.validate()
        } catch (error) {
          return false
        }
      }
    )
  }

  clearBlockchainTransactions({ block }) {
    block.data.forEach(transaction => {
      if (this.transactionMap[transaction.uuid]) {
        delete this.transactionMap[transaction.uuid]
      }
    })
  }
}

export default TransactionPool
