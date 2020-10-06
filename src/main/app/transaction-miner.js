class TransactionMiner {
  constructor({
    blockchain, transactionPool, wallet, pubsub,
  }) {
    this.blockchain = blockchain
    this.transactionPool = transactionPool
    this.wallet = wallet
    this.pubsub = pubsub
  }

  async mineTransactions() {
    const validTransactions = await this.transactionPool.validTransactions()
    const block = await this.blockchain.addBlock({ data: validTransactions, wallet: this.wallet })
    if (block) {
      this.pubsub.broadcastChain()
      this.transactionPool.clear({ block })
    }
  }
}
export default TransactionMiner
