const { STARTING_BALANCE, REWARD_ADDRESS, STAKE_ADDRESS } = require('../config')
const { ec, cryptoHash } = require('../util')

class Account {
  constructor({ address }) {
    this.balance = STARTING_BALANCE
    this.address = address
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
