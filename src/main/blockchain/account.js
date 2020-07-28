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

  static stringify({ account }) {
    return JSON.stringify({ account })
  }

  static parse({ jsonAccount }) {
    const { account } = JSON.parse(jsonAccount)
    const {
      lastTransactionId, publicKey, balance, stake,
    } = account

    const newAccount = new Account({ lastTransactionId, publicKey })
    newAccount.addBalance({ amount: balance })
    newAccount.addStake({ amount: stake })
    return newAccount
  }

  static calculateBalance({ chain, address }) {
    const block = chain.getGenesisBlock()
    const collectBlockFees = false
    // do {
    //   collectBlockFees = (address === block.validator)
    //   const { transactions } = block.data
    //
    //   block = chain.getNextBlock(block)
    // } while (block)
    //
    // return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal
  }
}

export default Account
