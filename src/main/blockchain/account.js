import Obj2fsHOC from 'obj2fs-hoc'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

import Crypto from '../util/crypto'
import config from '../config'

const path = require('path')

const Big = require('big.js')

class Account {
  constructor({ publicKey }) {
     // have to make publicKey optional
    this.publicKey = publicKey
    this.balance = '0'
    this.stake = '0'
    this.stakeTimestamp = dayjs().utc().valueOf()

     // the key is derived from the publicKey when constructor is called, no need to expicitely set it
    this.key = path.join(config.STORE.ACCOUNTS, Crypto.hash(this.publicKey))
   }

  addBalance({ amount }) {
    this.balance = Big(this.balance).plus(amount).valueOf()
   }

  subtractBalance({ amount }) {
    if (Big(amount).gt(this.balance)) {
      throw new Error('trying to substract bigger amount than possible')
       }
    this.balance = Big(this.balance).minus(amount).valueOf()
   }

  addStake({ amount }) {
    this.subtractBalance({ amount })
    this.stake = Big(this.stake).plus(amount).valueOf()
    this.stakeTimestamp = dayjs().utc().valueOf()
   }

  subtractStake({ amount }) {
    if (Big(amount).gt(this.stake)) throw new Error('trying to substract bigger amount than possible')
    this.addBalance({ amount })
    this.stake = Big(this.stake).minus(amount).valueOf()
    this.stakeTimestamp = dayjs().utc().valueOf()
   }

  calculateBalance() {
     // TODO: to implement
    return this
   }

  setHash({ hash }) {
    this.setKey(path.join(config.STORE.ACCOUNTS, hash))
    return this
   }
}

export default Obj2fsHOC(Account)
