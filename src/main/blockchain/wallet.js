import Obj2fsHooks from 'obj2fs-hooks'

import Crypto from '../util/crypto'
import Transaction from './transaction'

const crypto = require('crypto')

const path = require('path')

const { STORE } = require('../config')

function Wallet() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  this.publicKey = publicKey
  this.privateKey = privateKey

  this.sign = function (data) {
    const sign = crypto.createSign('SHA512')
    sign.write(Crypto.hash(data))
    sign.end()
    const signature = sign.sign(privateKey, 'hex')
    return signature
  }

  // this method is called to create transaction that goes into transaction pool,
  // there is no other place to create new transaction,
  // at this point the transaction should be signed and never modified.
  // This should be the only way to create transaction
  this.createTransaction = function ({ recipient, amount, fee }) {
    const transaction = new Transaction({
      sender: this.publicKey, recipient, amount, fee,
    })
    transaction.signature = this.sign([
      transaction.uuid,
      transaction.timestamp,
      transaction.sender,
      transaction.recipient,
      transaction.ammount,
      transaction.fee,
    ])
    return transaction
  }

  Object.assign(
    this,
    Obj2fsHooks(this),
  )
  // this is only one wallet per running application, so it's OK to hard code it here
  this.setKey(path.resolve(STORE.WALLET))
  return this
}

export default Wallet
