const Block = require('./block')
const Transaction = require('../wallet/transaction')
const Wallet = require('../wallet')
const { cryptoHash } = require('../util')
const { REWARD_INPUT, MINING_REWARD } = require('../../config')

class Blockchain {
  constructor() {
    this.chain = [
      Block.genesis(),
    ]
  }

  addBlock({ data }) {
    const newBlock = Block.mineBlock({
      lastBlock: this.chain[this.chain.length - 1],
      data,
    })

    this.chain.push(newBlock)
  }

  replaceChain(chain, validateTransactions, onSuccess) {
    if (chain.length <= this.chain.length) {
      console.error('The incoming chain must be longer') // eslint-disable-line no-console
      return
    }

    if (!Blockchain.isValidChain(chain)) {
      console.error('The incoming chain must be valid') // eslint-disable-line no-console
      return
    }

    if (validateTransactions && !this.validTransactionData({ chain })) {
      console.error('The incoming chain has invalid data') // eslint-disable-line no-console
      return
    }

    if (onSuccess) onSuccess()
    console.log('replacing chain with', chain) // eslint-disable-line no-console
    this.chain = chain
  }

  validTransactionData({ chain }) {
    for (let i = 1; i < chain.length; i++) { // eslint-disable-line no-plusplus
      const block = chain[i]
      const transactionSet = new Set()
      let rewardTransactionCount = 0

      for (const transaction of block.data) { // eslint-disable-line no-restricted-syntax
        if (transaction.input.address === REWARD_INPUT.address) {
          rewardTransactionCount += 1

          if (rewardTransactionCount > 1) {
            console.error('Miner rewards exceed limit') // eslint-disable-line no-console
            return false
          }

          if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
            console.error('Miner reward amount is invalid') // eslint-disable-line no-console
            return false
          }
        } else {
          if (!Transaction.validTransaction(transaction)) {
            console.error('Invalid transaction') // eslint-disable-line no-console
            return false
          }

          const trueBalance = Wallet.calculateBalance({
            chain: this.chain,
            address: transaction.input.address,
          })

          if (transaction.input.amount !== trueBalance) {
            console.error('Invalid input amount') // eslint-disable-line no-console
            console.error(`transaction.input.amount:${transaction.input.amount} trueBalance:${trueBalance}`) // eslint-disable-line no-console
            return false
          }

          if (transactionSet.has(transaction)) {
            console.error('An identical transaction appears more than once in the block') // eslint-disable-line no-console
            return false
          }
          transactionSet.add(transaction)
        }
      }
    }

    return true
  }

  static isValidChain(chain) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
      return false
    }

    for (let i = 1; i < chain.length; i++) { // eslint-disable-line no-plusplus
      const {
        timestamp, lastHash, hash, nonce, difficulty, data,
      } = chain[i]
      const actualLastHash = chain[i - 1].hash
      const lastDifficulty = chain[i - 1].difficulty

      if (lastHash !== actualLastHash) return false

      const validatedHash = cryptoHash(timestamp, lastHash, data, nonce, difficulty)

      if (hash !== validatedHash) return false

      if (Math.abs(lastDifficulty - difficulty) > 1) return false
    }

    return true
  }
}

module.exports = Blockchain
