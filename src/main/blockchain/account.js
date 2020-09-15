import moment from 'moment'
import Obj2fsHooks from 'obj2fs-hooks'
import Crypto from '../util/crypto'

import config from '../config'

const path = require('path')
const Big = require('big.js')

function Account({ publicKey } = { publicKey: '' }) {
  // have to make publicKey optional
  this.publicKey = publicKey
  this.balance = '0'
  this.stake = '0'
  this.stakeTimestamp = moment.utc().valueOf()

  this.addBalance = function ({ amount }) {
    this.balance = Big(this.balance).plus(amount).valueOf()
  }

  this.subtractBalance = function ({ amount }) {
    if (Big(amount).gt(this.balance)) {
      throw new Error('trying to substract bigger amount than possible')
    }
    this.balance = Big(this.balance).minus(amount).valueOf()
  }

  this.addStake = function ({ amount }) {
    this.subtractBalance({ amount })
    this.stake = Big(this.stake).plus(amount).valueOf()
    this.stakeTimestamp = moment.utc().valueOf()
  }

  this.subtractStake = function ({ amount }) {
    if (Big(amount).gt(this.stake)) {
      throw new Error('trying to substract bigger amount than possible')
    }
    this.addBalance({ amount })
    this.stake = Big(this.stake).minus(amount).valueOf()
    this.stakeTimestamp = moment.utc().valueOf()
  }

  this.calculateBalance = function () {
    // TODO: to implement
  }

  Object.assign(
    this,
    Obj2fsHooks(this),
  )
  // the key is derived from the publicKey when constructor is called, no need to expicitely set it
  this.setKey(path.join(config.STORE.ACCOUNTS, Crypto.hash(this.publicKey)))
  return this
}

export default Account
