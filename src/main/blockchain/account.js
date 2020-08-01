import moment from 'moment'
import Json2ObjHOC from 'json2obj-hoc'

class Account {
  // have to make publicKey optional for json2Obj HOC to work
  constructor({ publicKey } = { publicKey: '' }) {
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

  calculateBalance() {
    // TODO: to implement
  }
}

export default Json2ObjHOC(Account)
