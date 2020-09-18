import Obj2fsHOC from 'obj2fs-hoc'

import Crypto from '../util/crypto'
import Transaction from './transaction'
import Account from './account'

import config from '../config'

const Big = require('big.js')

const crypto = require('crypto')

const path = require('path')

class Wallet {
  constructor() {
    // this is only one wallet per running application, so it's OK to hard code it here
    this.key = path.resolve(config.STORE.WALLET)

    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
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
  }

  sign(data) {
    const sign = crypto.createSign('SHA512')
    sign.write(Crypto.hash(data))
    sign.end()
    return sign.sign(this.privateKey, 'hex')
  }

  transactionSignature({ transaction }) {
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
  createTransaction({ recipient, amount, fee }) {
    const transaction = new Transaction({
      sender: this.publicKey, recipient, amount, fee,
    })
    transaction.signature = this.transactionSignature({ transaction })
    return transaction
  }

  // this creates a reward transaction for this wallet.
  // This transaction does not have to be added to the pool
  createRewardTransaction() {
    const transaction = new Transaction({
      sender: this.publicKey, recipient: config.REWARD_ADDRESS, amount: config.REWARD_AMOUNT, fee: 0,
    })
    transaction.signature = this.transactionSignature({ transaction })
    return transaction
  }

  createStakeTransaction({ amount, fee }) {
    const transaction = new Transaction({
      sender: this.publicKey, recipient: config.STAKE_ADDRESS, amount, fee,
    })
    transaction.signature = this.transactionSignature({ transaction })
    return transaction
  }

  // TODO: TOTEST
  getAccount() {
    const account = new Account({ publicKey: this.publicKey }).retrieveOrNew()
    return account
  }
}

export default Obj2fsHOC(Wallet)
