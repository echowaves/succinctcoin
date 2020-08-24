import moment from 'moment'
import Obj2fsHooks from 'obj2fs-hooks'
import Crypto from '../util/crypto'

const path = require('path')
const { STORE } = require('../config')

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

  Object.assign(
    this,
    Obj2fsHooks(this),
  )
  // the key is derived from the publicKey, no need to expicitely set it
  this.setKey(path.join(STORE.ACCOUNTS, Crypto.hash(this.publicKey)))
  return this
}

export default Account
