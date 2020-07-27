const { STARTING_BALANCE, REWARD_ADDRESS, STAKE_ADDRESS } = require('../config')
const { ec, cryptoHash } = require('../util')

class Account {
  constructor({ lastTransactionId, publicKey }) {
    this.lastTransactionId = lastTransactionId
    this.publicKey = publicKey
    this.balance = 0
    this.stake = 0
  }

  addBalance({ amount }) {
    this.balance += amount
  }

  subtractBalance({ amount }) {
    if (amount > this.balance) {
      throw new Error('trying to substract bigger amount than possible')
    }
    this.balance -= amount
  }

  addStake({ amount }) {
    this.stake += amount
  }

  subtractStake({ amount }) {
    if (amount > this.stake) {
      throw new Error('trying to substract bigger amount than possible')
    }
    this.stake -= amount
  }

  static parseAccount({ jsonString }) {

  }

  static accountToString({ account }) {

  }

  static calculateBalance({ chain, address }) {
    let block = chain.getGenesisBlock()
    let collectBlockFees = false
    do {
      collectBlockFees = (address === block.validator)
      const { transactions } = block.data

      block = chain.getNextBlock(block)
    } while (block)

    return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal
  }
}

module.exports = Account
