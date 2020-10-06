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

  async validTransactions() {
    const values = Object.values(this.transactionMap)

    const shouldFilter = await Promise.all(values.map(async value => {
      try {
        const valid = await value.validate()
        return valid
      } catch (error) {
        return false
      }
    }))

    return values.filter((value, index) => shouldFilter[index])
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
