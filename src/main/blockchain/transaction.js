import moment from 'moment'

import Crypto from '../util/crypto'

const { REWARD_INPUT, MINING_REWARD } = require('../config')

class Transaction {
  constructor({
    wallet, sender, recipient, amount, fee,
  }) {
    this.wallet = wallet
    this.sender = sender
    this.recipient = recipient
    this.amount = amount
    this.fee = fee
    this.timestamp = moment.utc().valueOf()
    this.signature = wallet.sign({
      sender, recipient, amount, fee, timestamp: this.timestamp,
    })
  }

  static validate(transaction) {
    const { input: { address, amount, signature }, outputMap } = transaction

    const outputTotal = Object.values(outputMap)
      .reduce((total, outputAmount) => total + outputAmount)

    if (amount !== outputTotal) {
      console.error(`Invalid transaction from ${address}`) // eslint-disable-line no-console
      return false
    }

    if (!verifySignature({ publicKey: address, data: outputMap, signature })) {
      console.error(`Invalid signature from ${address}`) // eslint-disable-line no-console
      return false
    }

    return true
  }

  static rewardTransaction({ minerWallet }) {
    return new this({
      input: REWARD_INPUT,
      outputMap: { [minerWallet.publicKey]: MINING_REWARD },
    })
  }

  static stringify({ transaction }) {
    return JSON.stringify({ transaction })
  }

  static parse({ jsonAccount }) {
    // const { account } = JSON.parse(jsonAccount)
    // const {
    //   publicKey, balance, stake, stakeTimestamp,
    // } = account
    //
    // const newAccount = new Account({ publicKey })
    // newAccount.addBalance({ amount: balance })
    // newAccount.addBalance({ amount: stake })
    // newAccount.addStake({ amount: stake })
    // newAccount.stakeTimestamp = stakeTimestamp
    // return newAccount
  }
}

module.exports = Transaction
