import fs from 'fs'
import Crypto from '../util/crypto'

const Transaction = require('./transaction')
// const Account = require('./account')

const { STARTING_BALANCE, STORE } = require('../config')

// let's initialize wallet from the disk
if (!fs.existsSync(STORE.WALLET)) {
  const keyPair = Crypto.genKeyPair()
  const wallet = new Wallet({ keyPair })
  wallet.store()
}

class Wallet {
  constructor({ keyPair }) {
    this.keyPair = Crypto.genKeyPair()
    this.publicKey = this.keyPair.getPublic().encode('hex')
    this.privateKey = this.keyPair.get
  }

  sign(...data) {
    return this.keyPair.sign(Crypto.hash(data.map(input => JSON.stringify(input)).sort().join(' ')))
  }

  createTransaction({ recipient, amount, chain }) {
    if (chain) {
      this.balance = Wallet.calculateBalance({
        chain,
        address: this.publicKey,
      })
    }

    if (amount > this.balance) {
      throw new Error('Amount exceeds balance')
    }

    return new Transaction({ senderWallet: this, recipient, amount })
  }

  static calculateBalance({ chain, address }) {
    let hasConductedTransaction = false
    let outputsTotal = 0

    for (let i = chain.length - 1; i > 0; i--) { // eslint-disable-line no-plusplus
      const block = chain[i]

      for (const transaction of block.data) { // eslint-disable-line no-restricted-syntax
        if (transaction.input.address === address) {
          hasConductedTransaction = true
        }

        const addressOutput = transaction.outputMap[address]

        if (addressOutput) {
          outputsTotal += addressOutput
        }
      }

      if (hasConductedTransaction) {
        break
      }
    }

    return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal
  }
}

module.exports = Wallet
