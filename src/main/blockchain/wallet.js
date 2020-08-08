// import fs from 'fs'
import Obj2fsHooks from 'obj2fs-hooks'
import Crypto from '../util/crypto'

const crypto = require('crypto')

//
// const { STORE } = require('../config')

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

  // createTransaction({ recipient, amount, chain }) {
  //   if (chain) {
  //     this.balance = Wallet.calculateBalance({
  //       chain,
  //       address: this.publicKey,
  //     })
  //   }
  //
  //   if (amount > this.balance) {
  //     throw new Error('Amount exceeds balance')
  //   }
  //
  //   return new Transaction({ senderWallet: this, recipient, amount })
  // }

  // static calculateBalance({ chain, address }) {
  //   let hasConductedTransaction = false
  //   let outputsTotal = 0
  //
  //   for (let i = chain.length - 1; i > 0; i--) { // eslint-disable-line no-plusplus
  //     const block = chain[i]
  //
  //     for (const transaction of block.data) { // eslint-disable-line no-restricted-syntax
  //       if (transaction.input.address === address) {
  //         hasConductedTransaction = true
  //       }
  //
  //       const addressOutput = transaction.outputMap[address]
  //
  //       if (addressOutput) {
  //         outputsTotal += addressOutput
  //       }
  //     }
  //
  //     if (hasConductedTransaction) {
  //       break
  //     }
  //   }
  //
  //   return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal
  // }
  return Object.assign(
    this,
    Obj2fsHooks(this),
  )
}

export default Wallet
