import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'

import Obj2fsHooks from 'obj2fs-hooks'
import Crypto from '../util/crypto'

const path = require('path')

const { GENESIS_DATA } = require('../config')

const { STORE } = require('../config')

function Block({ lastBlock, data } = { lastBlock: null, data: '' }) {
  this.height = lastBlock ? lastBlock.height + 1 : 0
  this.uuid = uuidv4()
  this.timestamp = moment.utc().valueOf() // assigned when block is created
  this.lastHash = lastBlock ? lastBlock.hash : ''
  this.hash = ''
  this.validator = ''
  this.signature = ''
  this.data = data

  // this function should generate hash and sign the block
  this.mineBlock = function ({ wallet }) {
    this.validator = wallet.publicKey

    this.hash = Crypto.hash(
      this.height,
      this.uuid,
      this.timestamp,
      this.validator,
      this.lastHash,
      this.data,
    )
    this.signature = wallet.sign(this.hash)
    return this
  }

  this.validate = function () {
    if (!Crypto.verifySignature({
      publicKey: this.validator,
      data: [this.hash],
      signature: this.signature,
    })) {
      throw new Error('Invalid signature')
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
