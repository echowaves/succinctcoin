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

  // AD-13: additive uuid merge of a remote pool into the local one. Local
  // entries survive uuid collisions; merging into an empty local map equals
  // adoption. There is deliberately no full-replace path.
  syncFromRemote({ remoteMap }) {
    this.transactionMap = { ...remoteMap, ...this.transactionMap }
  }

  existingTransaction({ sender }) {
    const transactions = Object.values(this.transactionMap)

    return transactions.find(transaction => transaction.sender === sender)
  }

  async validTransactions({ state } = { state: {} }) {
    const values = Object.values(this.transactionMap)

    const shouldFilter = await Promise.all(values.map(async value => {
      try {
        const valid = await value.validate({ state })
        return valid
      } catch (error) {
        console.error(`Invalid transaction ${value.uuid}: ${error.message}`)
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
