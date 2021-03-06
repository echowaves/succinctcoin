import Obj2fsHOC from 'obj2fs-hoc'

import { v4 as uuidv4 } from 'uuid'
// import moment from 'moment'

import Crypto from '../util/crypto'

import config from '../config'

const path = require('path')

class Block {
  constructor({ lastBlock, data } = { lastBlock: null, data: [] }) {
    this.height = lastBlock ? lastBlock.height + 1 : 0
    this.uuid = uuidv4()
    // this.timestamp = moment.utc().valueOf() // assigned when block is created
    this.lastHash = lastBlock ? lastBlock.hash : ''
    this.hash = ''
    this.miner = ''
    this.signature = ''
    this.data = [...data]
    this.lastBlock = lastBlock
    // the key is derived from the publicKey when constructor is called, no need to expicitely set it
    this.key = path.join(config.STORE.BLOCKS, this.height.toString().padStart(21, 0))
  }

  static genesis() {
    return Object.assign(new Block(), config.GENESIS_DATA)
  }

  // this function should generate hash and sign the block
  async mineBlock({ wallet }) {
    this.miner = wallet.publicKey

    // add reward transaction and
    // make blocks timestamp to be equal the timestamp of reward transaction
    const rewardTrasaction = wallet.createRewardTransaction()
    this.timestamp = rewardTrasaction.timestamp

    this.data.push(rewardTrasaction)
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

  async validate() {
    // genesis blocl is always valid
    if (JSON.stringify(this) === JSON.stringify(Block.genesis())) {
      return true
    }

    if (this.data === undefined || this.data === null || JSON.stringify(this.data) === '{}' || this.data.length === 0) {
      throw new Error('Bad data')
    }

    // check the the data contains non empty array, height > 3 allows the first 3 miners to mine empty blocks, to be able to bootstrap initial balance
    if (this.data.length === 1 && this.data[0].recipient === config.REWARD_ADDRESS && this.height > 3) {
      throw new Error('Empty data')
    }

    // check that there is only 1 reward transaction per block
    if (this.data.filter(transaction => transaction.recipient === config.REWARD_ADDRESS).length !== 1) {
      throw new Error('Invalid number of rewards')
    }

    // check for duplciate transactions
    if (this.data.filter((transaction, index, self) => index === self.findIndex(t => (
      t.uuid === transaction.uuid
    ))).length < this.data.length) {
      throw new Error('Duplicate transactions')
    }

    if (this.lastBlock.height + 1 !== this.height) {
      throw new Error('Invalid height')
    }

    // timestamp of each transaction must be less than timestamp of block
    this.data.forEach(transaction => {
      if (this.timestamp <= transaction.timestamp && transaction.recipient !== config.REWARD_ADDRESS) {
        throw new Error('Invalid transaction timestamp')
      }
      if (this.timestamp !== transaction.timestamp && transaction.recipient === config.REWARD_ADDRESS) {
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
    // every transaction must be valid
    await Promise.all(this.data.map(async transaction => transaction.validate()))

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
}

export default Obj2fsHOC(Block)
