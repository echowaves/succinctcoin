import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'

import Obj2fsHooks from 'obj2fs-hooks'
import Crypto from '../util/crypto'
import Account from './account'

const Big = require('big.js')

const { REWARD_ADDRESS, STAKE_ADDRESS } = require('../config')
const { REWARD_AMOUNT } = require('../config')

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

  // TODO: do a better grouping of related validation logic blocks
  this.validate = function () {
    if (!Crypto.isPublicKey({ publicKey: this.sender })) {
      throw new Error('Sender invalid')
    }

    if (!Crypto.isPublicKey({ publicKey: this.recipient })
        && this.recipient !== REWARD_ADDRESS
        && this.recipient !== STAKE_ADDRESS) {
      throw new Error('Recipient invalid')
    }

    if (this.recipient === REWARD_ADDRESS && !Big(this.amount).eq(REWARD_AMOUNT)) {
      throw new Error('Invalid reward amount')
    }

    if (this.recipient === STAKE_ADDRESS && Big(this.amount).eq(0)) {
      throw new Error('Invalid stake amount')
    }

    if (this.sender === this.recipient) {
      throw new Error('Sender and Recipient are the same')
    }

    // expected the sender account already in the system -- simply retreive it
    // this will throw 'No such key or file name found on disk' if the account does not exist on disk
    const account = new Account({ publicKey: this.sender }).retrieve()

    if (this.recipient === STAKE_ADDRESS
      && (Big(this.amount).plus(account.stake)).gt(Big(account.balance).div(10))) {
      // console.log(`(${this.amount} + ${account.stake}) > ${account.balance} / 10)`)
      throw new Error('Stake too high')
    }
    if (this.recipient === STAKE_ADDRESS
      && (Big(account.stake).plus(this.amount).lt(0))) {
      // console.log(`(${this.amount} + ${account.stake}) > ${account.balance} / 10)`)
      throw new Error('Not enough stake')
    }

    if (Big(this.amount).lte(0) && this.recipient !== STAKE_ADDRESS) {
      throw new Error('Amount invalid')
    }

    if (this.recipient !== REWARD_ADDRESS) {
      if (Big(this.fee).lt(Big(this.amount).div(1000))) {
        throw new Error('Fee invalid')
      }
      // console.log(`${amount + fee} > ${account.balance}`)
      if (Big(this.amount).plus(this.fee).gt(account.balance) && this.recipient !== REWARD_ADDRESS) {
        throw new Error('Amount exceeds balance')
      }
    } else if (!Big(this.fee).eq(0)) { // this.recipient === REWARD_ADDRESS
      throw new Error('Invalid reward fee')
    }

    if (!this.verifySignature()) {
      // console.error(`Invalid signature from ${this.sender}`) // eslint-disable-line no-console
      throw new Error('Invalid signature')
    }
    return true
  }

  this.verifySignature = function () {
    return Crypto.verifySignature({
      publicKey: this.sender,
      data: [
        this.uuid,
        this.timestamp,
        this.sender,
        this.recipient,
        Big(this.ammount).valueOf(),
        Big(this.fee).valueOf(),
      ],
      signature: this.signature,
    })
  }
  // transaction should not be stored on disk as a separate file, as such there is no need to define KEY
  return Object.assign(
    this,
    Obj2fsHooks(this),
  )
}

export default Transaction
