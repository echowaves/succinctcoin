import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'

import Obj2fsHooks from 'obj2fs-hooks'

const { GENESIS_DATA } = require('../config')
const Crypto = require('../util/crypto')

function Block({ height, lastBlock, data } = { height: '', lastBlock: null, data: '' }) {
  this.height = height
  this.uuid = uuidv4()
  this.timestamp = moment.utc().valueOf() // assigned when block is created
  this.validator = ''
  this.lastHash = lastBlock ? lastBlock.hash : ''
  this.hash = ''
  this.data = data
  this.signature = ''

  Block.genesis = function () {
    return new this(GENESIS_DATA)
  }

  // this function should generate hash and sign the block
  this.mineBlock = function ({ wallet }) {
    this.hash = Crypto.hash(this.heigh, this.uuid, this.timestamp, this.validator, this.lastHash, this.data)
    this.signature = wallet.sign([
      this.heigh,
      this.uuid,
      this.timestamp,
      this.validator,
      this.lastHash,
      this.hash,
      this.data,
    ])
  }

  this.validate = function () {
    if (!Crypto.verifySignature({
      publicKey: this.sender,
      data: [
        this.heigh,
        this.uuid,
        this.timestamp,
        this.validator,
        this.lastHash,
        this.hash,
        this.data,
      ],
      signature: this.signature,
    })) {
      throw new Error('Invalid signature')
    }
    return true
  }

  return Object.assign(
    this,
    Obj2fsHooks(this),
  )
}

export default Block
