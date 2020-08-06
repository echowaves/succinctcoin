import moment from 'moment'
import Obj2fsHooks from 'obj2fs-hooks'

function Account({ publicKey } = { publicKey: '' }) {
  // have to make publicKey optional
  this.publicKey = publicKey
  this.balance = 0
  this.stake = 0
  this.stakeTimestamp = moment.utc().valueOf()

  this.addBalance = function ({ amount }) {
    this.balance += amount
  }

  this.subtractBalance = function ({ amount }) {
    if (amount > this.balance) {
      throw new Error('trying to substract bigger amount than possible')
    }
    this.balance -= amount
  }

  this.addStake = function ({ amount }) {
    this.subtractBalance({ amount })
    this.stake += amount
    this.stakeTimestamp = moment.utc().valueOf()
  }

  this.subtractStake = function ({ amount }) {
    if (amount > this.stake) {
      throw new Error('trying to substract bigger amount than possible')
    }
    this.addBalance({ amount })
    this.stake -= amount
    this.stakeTimestamp = moment.utc().valueOf()
  }

  this.calculateBalance = function () {
    // TODO: to implement
  }

  return Object.assign(
    this,
    Obj2fsHooks(this),
  )
}

export default Account
