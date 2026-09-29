import globalConfig from '../../config'
import coreConfig from '../config'
import deriveState from '../blockchain/state'
import isLotteryWinner from '../blockchain/lottery'

class TransactionMiner {
  constructor({
    blockchain, transactionPool, wallet, pubsub,
  }) {
    this.blockchain = blockchain
    this.transactionPool = transactionPool
    this.wallet = wallet
    this.pubsub = pubsub
    this.intervalId = null
    this.mining = false
    this.tick = this.tick.bind(this)
  }

  // AD-4: autonomous mining. Each re-check (app-semantic interval, distinct
  // from the core's VALIDATION_RATE) the node self-evaluates the pinned
  // lottery (AD-11) against the local chain head; only a winner mines.
  start() {
    if (this.intervalId === null) {
      this.intervalId = setInterval(this.tick, globalConfig.MINING_RECHECK_INTERVAL)
    }
    return this
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    return this
  }

  async tick() {
    if (this.mining) {
      return
    }
    this.mining = true
    try {
      const head = this.blockchain.chain[this.blockchain.chain.length - 1]
      const winner = isLotteryWinner({
        prevBlockHash: head.hash,
        publicKey: this.wallet.publicKey,
        odds: coreConfig.LOTTERY_ODDS,
      })
      if (winner) {
        await this.mineTransactions()
      }
    } finally {
      this.mining = false
    }
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
