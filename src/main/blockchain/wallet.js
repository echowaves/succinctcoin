// import fs from 'fs'
import Json2ObjHOC from 'json2obj-hoc'
import Crypto from '../util/crypto'

const path = require('path')
const fs = require('fs')

const { STORE } = require('../config')

class Wallet {
  constructor() {
    this.keyPair = Crypto.getKeyPair()
    this.publicKey = this.keyPair.getPublic().encode('hex')
  }

  static myWallet() {
    let wallet
    if (!fs.existsSync(STORE.WALLET)) {
      wallet = new Wallet()
      fs.writeFileSync(path.resolve(STORE.WALLET), JSON.stringify(wallet))
    } else {
      wallet = Wallet.parse(fs.readFileSync(path.resolve(STORE.WALLET)))
    }
  }

  // sign(...data) {
  //   return this.keyPair.sign(Crypto.hash(data.map(input => JSON.stringify(input)).sort().join(' ')))
  // }

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
}

export default Json2ObjHOC(Wallet)
