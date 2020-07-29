class Account {
  constructor({ publicKey }) {
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
      publicKey, balance, stake,
    } = account

    const newAccount = new Account({ publicKey })
    newAccount.addBalance({ amount: balance })
    newAccount.addStake({ amount: stake })
    return newAccount
  }
}

export default Account
