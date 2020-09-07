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
      throw new Error('Invalid signature')
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
    })

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
