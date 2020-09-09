import { v4 as uuidv4 } from 'uuid'
// import moment from 'moment'

import Obj2fsHooks from 'obj2fs-hooks'
import Crypto from '../util/crypto'

const path = require('path')

const { GENESIS_DATA } = require('../config')

const { STORE } = require('../config')
const { REWARD_ADDRESS/* , STAKE_ADDRESS */ } = require('../config')

function Block({ lastBlock, data } = { lastBlock: null, data: [] }) {
  // this.lastBlock = lastBlock
  this.height = lastBlock ? lastBlock.height + 1 : 0
  this.uuid = uuidv4()
  // this.timestamp = moment.utc().valueOf() // assigned when block is created
  this.lastHash = lastBlock ? lastBlock.hash : ''
  this.hash = ''
  this.miner = ''
  this.signature = ''
  this.data = [...data]

  // this function should generate hash and sign the block
  this.mineBlock = function ({ wallet }) {
    this.miner = wallet.publicKey

    // add reward transaction and
    // make blocks timestamp to be equal the timestamp of reward transaction
    const rewardTrasaction = wallet.createRewardTransaction()
    this.data.push(rewardTrasaction)
    this.timestamp = rewardTrasaction.timestamp
    // order transactions
    this.data.sort((a, b) => (a.timestamp >= b.timestamp ? 1 : -1))

    this.hash = Crypto.hash(
      this.height,
      this.uuid,
      this.timestamp,
      this.miner,
      this.lastHash,
      this.data,
    )
    this.signature = wallet.sign(this.hash)

    return this
  }

  this.validate = function () {
    if (this.data === undefined || this.data === null || JSON.stringify(this.data) === '{}' || this.data.length === 0) {
      throw new Error('Bad data')
    }

    // check the the data contains non empty array
    if (this.data.length === 1 && this.data[0].recipient === REWARD_ADDRESS) {
      throw new Error('Empty data')
    }

    // check that there is only 1 reward transaction per block
    if (this.data.filter(transaction => transaction.recipient === REWARD_ADDRESS).length !== 1) {
      throw new Error('Invalid number of rewards')
    }

    // check for duplciate transactions
    if (this.data.filter((transaction, index, self) => index === self.findIndex(t => (
      t.uuid === transaction.uuid
    ))).length < this.data.length) {
      throw new Error('Duplicate transactions')
    }

    if (lastBlock.height + 1 !== this.height) {
      throw new Error('Invalid height')
    }

    // every transaction must be valid
    this.data.forEach(transaction => {
      transaction.validate()
    })

    // timestamp of each transaction must be less than timestamp of block
    this.data.forEach(transaction => {
      if (this.timestamp <= transaction.timestamp && transaction.recipient !== REWARD_ADDRESS) {
        throw new Error('Invalid transaction timestamp')
      }
      if (this.timestamp !== transaction.timestamp && transaction.recipient === REWARD_ADDRESS) {
        throw new Error('Invalid reward transaction timestamp')
      }
    })

    // transaction must be ordered by timestamp ASC (reward transaction always last)
    let currentIteratorTimestamp = 0
    this.data.forEach(transaction => {
      if (currentIteratorTimestamp > transaction.timestamp) {
        throw new Error('Invalid sort order')
      }
      currentIteratorTimestamp = transaction.timestamp
    })

    // miner should be a valid publicKey
    if (!Crypto.isPublicKey({ publicKey: this.miner })) {
      throw new Error('Invalid miner')
    }

    if (
      Crypto.hash(
        this.height,
        this.uuid,
        this.timestamp,
        this.miner,
        this.lastHash,
        this.data,
      )
      !== this.hash) {
      throw new Error('Invalid hash')
    }

    if (!Crypto.verifySignature({
      publicKey: this.miner,
      data: this.hash,
      signature: this.signature,
    })) {
      throw new Error('Invalid block signature')
    }

    return true
  }

  Object.assign(
    this,
    Obj2fsHooks(this),
  )
  // the key is derived from the publicKey when constructor is called, no need to expicitely set it
  this.setKey(path.join(STORE.BLOCKS, this.height.toString().padStart(21, 0)))
  return this
}

Block.genesis = function () {
  return Object.assign(new Block(), GENESIS_DATA)
}

export default Block
