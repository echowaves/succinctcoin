class TransactionMiner {
  constructor({
    blockchain, transactionPool, wallet, pubsub,
  }) {
    this.blockchain = blockchain
    this.transactionPool = transactionPool
    this.wallet = wallet
    this.pubsub = pubsub
  }

  mineTransactions() {
    const validTransactions = this.transactionPool.validTransactions()

    // TODO: move this condition to an object and make it testable
    // only mine if there are transactions in the pool, otherwise it will create reward transaction without doing any work
    if (validTransactions.length) {
      this.blockchain.addBlock({ data: validTransactions, wallet: this.wallet })

      this.pubsub.broadcastChain()

      this.transactionPool.clear()
    }
  }
}
export default TransactionMiner
