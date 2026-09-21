import deriveState from '../blockchain/state'

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
    // derive the state of the current chain once and validate the pool
    // against it, so intra-block double-spends are caught against the
    // pre-block state (AD-10)
    const state = deriveState(this.blockchain.chain)
    const validTransactions = await this.transactionPool.validTransactions({ state })
    const block = await this.blockchain.addBlock({ data: validTransactions, wallet: this.wallet })
    if (block) {
      this.pubsub.broadcastChain()
      this.transactionPool.clear({ block })
    }
  }
}
export default TransactionMiner
