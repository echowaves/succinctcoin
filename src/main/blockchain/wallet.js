import path from 'path'

import Obj2fsHooks from 'obj2fs-hooks'

import Crypto from '../util/crypto'
import Transaction from './transaction'
import Account from './account'

const crypto = require('crypto')
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
  this.createTransaction = function ({ recipient, amount, fee }) {
    const account = new Account({
      publicKey: this.publicKey,
    }).retrieveOrNew(path.join(STORE.ACCOUNTS, Crypto.hash(this.publicKey)))

    if (amount <= 0) {
      throw new Error('Amount invalid')
    }
    if (fee < 0) {
      throw new Error('Fee invalid')
    }
    // console.log(`${amount + fee} > ${account.balance}`)
    if (amount + fee > account.balance) {
      throw new Error('Amount exceeds balance')
    }

    const transaction = new Transaction({
      sender: this.publicKey, recipient, amount, fee,
    })

    transaction.signature = this.sign(
      transaction.uuid,
      transaction.timestamp,
      transaction.sender,
      transaction.recipient,
      transaction.ammount,
      transaction.fee,
    )

    return transaction
  }

  return Object.assign(
    this,
    Obj2fsHooks(this),
  )
}

export default Wallet
