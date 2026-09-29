import { randomUUID } from 'crypto'

import Obj2fsHOC from 'obj2fs-hoc'
import dayjs from 'dayjs'

import Crypto from '../util/crypto'
import config from '../config'

import BlockchainError, { ERROR_CODES } from './errors'

const Big = require('big.js')

class Transaction {
  constructor({
  // the parameters passed at the time of transaction creation when it's added to the pool
    sender, recipient, amount, fee,
  } = {
    sender: '', recipient: '', amount: '0', fee: '0',
  }) {
    // transaction should not be stored on disk as a separate file, as such there is no need to define KEY
    this.uuid = randomUUID()
    this.timestamp = dayjs().utc().valueOf() // assigned when transaction is created, should be less then the block timestamp
    this.sender = sender
    this.recipient = recipient
    this.amount = amount
    this.fee = fee
  }

  // AD-10: state-free structure/crypto checks. No disk access, no balance
  // knowledge — those come from the derived chain state passed to validate().
  validateStructure() {
    if (!Crypto.isPublicKey({ publicKey: this.sender })) {
      throw new BlockchainError('Sender invalid', ERROR_CODES.INVALID_TRANSACTION)
    }

    if (!Crypto.isPublicKey({ publicKey: this.recipient })
        && this.recipient !== config.REWARD_ADDRESS
        && this.recipient !== config.STAKE_ADDRESS) {
      throw new BlockchainError('Recipient invalid', ERROR_CODES.INVALID_TRANSACTION)
    }

    if (this.recipient === config.REWARD_ADDRESS && !Big(this.amount).eq(config.REWARD_AMOUNT)) {
      throw new BlockchainError('Invalid reward amount', ERROR_CODES.INVALID_TRANSACTION)
    }

    if (this.recipient === config.STAKE_ADDRESS && Big(this.amount).eq(0)) {
      throw new BlockchainError('Invalid stake amount', ERROR_CODES.INVALID_TRANSACTION)
    }

    if (this.sender === this.recipient) {
      throw new BlockchainError('Sender and Recipient are the same', ERROR_CODES.INVALID_TRANSACTION)
    }

    if (Big(this.amount).lte(0) && this.recipient !== config.STAKE_ADDRESS) {
      throw new BlockchainError('Amount invalid', ERROR_CODES.INVALID_TRANSACTION)
    }

    if (this.recipient !== config.REWARD_ADDRESS) {
      if (Big(this.fee).lt(Big(this.amount).div(1000))) {
        throw new BlockchainError('Fee invalid', ERROR_CODES.INVALID_TRANSACTION)
      }
    } else if (!Big(this.fee).eq(0)) { // this.recipient === REWARD_ADDRESS
      throw new BlockchainError('Invalid reward fee', ERROR_CODES.INVALID_TRANSACTION)
    }

    return true
  }

  // Balance sufficiency is checked against the derived chain state
  // (AD-10). An account absent from `state` has balance '0' and stake '0'.
  validateState({ state } = { state: {} }) {
    const sender = state[this.sender]
    const balance = sender ? Big(sender.balance) : Big(0)
    const stake = sender ? Big(sender.stake) : Big(0)

    if (this.recipient === config.STAKE_ADDRESS) {
      if (Big(this.amount).plus(stake).gt(balance.div(10))) {
        throw new BlockchainError('Stake too high', ERROR_CODES.INVALID_TRANSACTION)
      }
      if (stake.plus(this.amount).lt(0)) {
        throw new BlockchainError('Not enough stake', ERROR_CODES.INVALID_TRANSACTION)
      }
      if (Big(this.amount).plus(this.fee).gt(balance)) {
        throw new BlockchainError('Amount exceeds balance', ERROR_CODES.INSUFFICIENT_BALANCE)
      }
    }

    if (this.recipient !== config.REWARD_ADDRESS
      && Big(this.amount).plus(this.fee).gt(balance)) {
      throw new BlockchainError('Amount exceeds balance', ERROR_CODES.INSUFFICIENT_BALANCE)
    }
    return true
  }

  async validate({ state } = { state: {} }) {
    this.validateStructure()
    if (!await this.verifySignature()) {
      // console.error(`Invalid signature from ${this.sender}`) // eslint-disable-line no-console
      throw new BlockchainError('Invalid transaction signature', ERROR_CODES.INVALID_SIGNATURE)
    }
    this.validateState({ state })
    return true
  }

  verifySignature() {
    return Crypto.verifySignature({
      publicKey: this.sender,
      data: [
        this.uuid,
        this.timestamp,
        this.sender,
        this.recipient,
        Big(this.amount).valueOf(),
        Big(this.fee).valueOf(),
      ],
      signature: this.signature,
    })
  }
}

export default Obj2fsHOC(Transaction)
