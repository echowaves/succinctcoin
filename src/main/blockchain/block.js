import { randomUUID } from 'crypto'

import Obj2fsHOC from 'obj2fs-hoc'
// import moment from 'moment'

import Crypto from '../util/crypto'
import config from '../config'

import { applyTransaction } from './state'

const path = require('path')

// AD-12: the single canonical total order on block `data` — timestamp ASC,
// then uuid ASC. One shared function used by both `mineBlock` (sorts before
// hashing) and `validate` (rejects blocks that violate the order), so
// identical logical contents always yield identical `data` order and hash.
const sortTransactions = data => data.slice().sort((a, b) =>
  a.timestamp !== b.timestamp
    ? (a.timestamp < b.timestamp ? -1 : 1)
    : (a.uuid < b.uuid ? -1 : 1),
)

class Block {
  constructor({ lastBlock, data } = { lastBlock: null, data: [] }) {
    this.height = lastBlock ? lastBlock.height + 1 : 0
    this.uuid = randomUUID()
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
    const rewardTransaction = await wallet.createRewardTransaction()
    this.timestamp = rewardTransaction.timestamp

    this.data.push(rewardTransaction)
    // order transactions canonically (AD-12): timestamp ASC, then uuid ASC
    this.data = sortTransactions(this.data)

    this.hash = Crypto.hash(
      this.height,
      this.uuid,
      this.timestamp,
      this.miner,
      this.lastHash,
      this.data,
    )
    this.signature = await wallet.sign(this.hash)
    return this
  }

  async validate({ state } = { state: {} }) {
    // genesis blocl is always valid
    if (JSON.stringify(this) === JSON.stringify(Block.genesis())) {
      return true
    }

    if ((this.data === undefined || this.data === null || JSON.stringify(this.data) === '{}') || (this.data.length === 0 && this.height > 3)) {
      throw new Error('Bad data')
    }
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

    // timestamp of each transaction must be less than or equal to timestamp of block
    this.data.forEach(transaction => {
      if (this.timestamp < transaction.timestamp && transaction.recipient !== config.REWARD_ADDRESS) {
        throw new Error('Invalid transaction timestamp')
      }
      if (this.timestamp !== transaction.timestamp && transaction.recipient === config.REWARD_ADDRESS) {
        throw new Error('Invalid reward transaction timestamp')
      }
    })

    // AD-12: data must already be in the canonical total order
    // (timestamp ASC, then uuid ASC) — the same order `mineBlock` applies
    const canonicalData = sortTransactions(this.data)
    if (canonicalData.length !== this.data.length
      || canonicalData.some((transaction, index) => (
        transaction.uuid !== this.data[index].uuid
        || transaction.timestamp !== this.data[index].timestamp
      ))) {
      throw new Error('Invalid sort order')
    }

    // miner should be a valid publicKey
    if (!Crypto.isPublicKey({ publicKey: this.miner })) {
      throw new Error('Invalid miner')
    }
    // every transaction must be valid against the running chain-derived
    // state, advancing the state as each transaction is applied (AD-10)
    const runningState = { ...state }
    for (const transaction of this.data) {
      await transaction.validate({ state: runningState })
      applyTransaction(runningState, transaction, this.miner)
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

    if (!await Crypto.verifySignature({
      publicKey: this.miner,
      data: this.hash,
      signature: this.signature,
    })) {
      throw new Error('Invalid block signature')
    }
    return true
  }
}

export { sortTransactions }
export default Obj2fsHOC(Block)
