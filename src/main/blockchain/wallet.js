import Obj2fsHooks from 'obj2fs-hooks'

import Crypto from '../util/crypto'
import Transaction from './transaction'

import config from '../config'

const Big = require('big.js')

const crypto = require('crypto')

const path = require('path')

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
    return sign.sign(this.privateKey, 'hex')
  }

  this.transactionSignature = function ({ transaction }) {
    const signature = this.sign([
      transaction.uuid,
      transaction.timestamp,
      transaction.sender,
      transaction.recipient,
      Big(transaction.ammount).valueOf(),
      Big(transaction.fee).valueOf(),
    ])
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
    transaction.signature = this.transactionSignature({ transaction })
    return transaction
  }

  // this creates a reward transaction for this wallet.
  // This transaction does not have to be added to the pool
  this.createRewardTransaction = function () {
    const transaction = new Transaction({
      sender: this.publicKey, recipient: config.REWARD_ADDRESS, amount: config.REWARD_AMOUNT, fee: 0,
    })
    transaction.signature = this.transactionSignature({ transaction })
    return transaction
  }

  this.createStakeTransaction = function ({ amount, fee }) {
    const transaction = new Transaction({
      sender: this.publicKey, recipient: config.STAKE_ADDRESS, amount, fee,
    })
    transaction.signature = this.transactionSignature({ transaction })
    return transaction
  }

  Object.assign(
    this,
    Obj2fsHooks(this),
  )
  // this is only one wallet per running application, so it's OK to hard code it here
  this.setKey(path.resolve(config.STORE.WALLET))
  return this
}

export default Wallet
