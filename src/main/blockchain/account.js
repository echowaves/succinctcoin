import moment from 'moment'

class Account {
  constructor({ publicKey }) {
    this.publicKey = publicKey
    this.balance = 0
    this.stake = 0
    this.stakeTimestamp = moment.utc().valueOf()
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
    this.subtractBalance({ amount })
    this.stake += amount
    this.stakeTimestamp = moment.utc().valueOf()
  }

  subtractStake({ amount }) {
    if (amount > this.stake) {
      throw new Error('trying to substract bigger amount than possible')
    }
    this.addBalance({ amount })
    this.stake -= amount
    this.stakeTimestamp = moment.utc().valueOf()
  }

  static stringify({ account }) {
    return JSON.stringify({ account })
  }

  static parse({ jsonAccount }) {
    const { account } = JSON.parse(jsonAccount)
    const {
      publicKey, balance, stake, stakeTimestamp,
    } = account

    const newAccount = new Account({ publicKey })
    newAccount.addBalance({ amount: balance })
    newAccount.addBalance({ amount: stake })
    newAccount.addStake({ amount: stake })
    newAccount.stakeTimestamp = stakeTimestamp
    return newAccount
  }

  calculateBalance() {
    // TODO: to implement
  }
}

export default Account
