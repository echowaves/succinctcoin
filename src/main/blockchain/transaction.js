import path from 'path'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'

import Obj2fsHooks from 'obj2fs-hooks'

import Crypto from '../util/crypto'

import Account from './account'

const { STORE } = require('../config')

function Transaction({
  // the parameters passed at the time of transaction creation when it's added to the pool
  sender, recipient, amount, fee,
}) {
  this.uuid = uuidv4()
  this.timestamp = moment.utc().valueOf() // assigned when transaction is created, should be less then the block timestamp
  this.sender = sender
  this.recipient = recipient
  this.amount = amount
  this.fee = fee

  this.validate = function () {
    // expected the sender account already in the system -- simply retreive it
    const account = new Account().retrieve(path.join(STORE.ACCOUNTS, Crypto.hash(this.sender)))

    if (this.amount <= 0) {
      throw new Error('Amount invalid')
    }
    if (this.fee < 0) {
      throw new Error('Fee invalid')
    }
    // console.log(`${amount + fee} > ${account.balance}`)
    if (this.amount + this.fee > account.balance) {
      throw new Error('Amount exceeds balance')
    }

    if (!Crypto.verifySignature({
      publicKey: this.sender,
      data: [
        this.uuid,
        this.timestamp,
        this.sender,
        this.recipient,
        this.ammount,
        this.fee],
      signature: this.signature,
    })) {
      console.error(`Invalid signature from ${this.sender}`) // eslint-disable-line no-console
      return false
    }
    return true
  }

  return Object.assign(
    this,
    Obj2fsHooks(this),
  )
}

export default Transaction
