import Obj2fsHOC from 'obj2fs-hoc'

import Crypto from '../util/crypto'
import config from '../config'

import Transaction from './transaction'
import Account from './account'

// Use dynamic imports for ESM-only packages to work with Jest's CJS environment
// Babel transforms these into Promise-based require() calls
const libp2pCryptoKeys = () => import('@libp2p/crypto/keys')
const libp2pPeerId = () => import('@libp2p/peer-id')

// Use @noble/secp256k1 (externalized in webpack, mocked in Jest)
// v3.1.0 exports: keygen(), signAsync(), verify(), getPublicKey()
const ecrypto = require('@noble/secp256k1')

const path = require('path')
const Big = require('big.js')

class Wallet {
  constructor() {
    // this is only one wallet per running application, so it's OK to hard code it here
    this.key = path.resolve(config.STORE.WALLET)

    // Use secp256k1 for both signing and libp2p peer identity
    const { secretKey, publicKey } = ecrypto.keygen()
    this.privateKey = Crypto.bytesToHex(secretKey)
    this.publicKey = Crypto.bytesToHex(publicKey.length === 33
      ? ecrypto.getPublicKey(secretKey, false)
      : publicKey)
  }

  /**
   * Returns the libp2p PeerId derived from this wallet's public key.
   * Used for ENR generation and discv5 peer discovery.
   * @returns {Promise<import('@libp2p/interface').PeerId>}
   */
  async getPeerId() {
    const { publicKeyFromRaw } = await libp2pCryptoKeys()
    const { peerIdFromPublicKey } = await libp2pPeerId()
    // Convert hex public key to raw bytes
    const raw = Crypto.hexToBytes(this.publicKey)
    const libp2pPubKey = publicKeyFromRaw(raw, 'secp256k1')
    return peerIdFromPublicKey(libp2pPubKey)
  }

  /**
   * Sign data using secp256k1 ECDSA with SHA-512.
   * @param {*} data
   * @returns {Promise<string>} hex-encoded signature
   */
  async sign(data) {
    const hash = Crypto.hash(data)
    const msgBytes = Crypto.hexToBytes(hash)
    const privBytes = Crypto.hexToBytes(this.privateKey)
    const sig = await ecrypto.signAsync(msgBytes, privBytes)
    return Crypto.bytesToHex(sig)
  }

  async transactionSignature({ transaction }) {
    const signature = await this.sign([
      transaction.uuid,
      transaction.timestamp,
      transaction.sender,
      transaction.recipient,
      Big(transaction.amount).valueOf(),
      Big(transaction.fee).valueOf(),
    ])
    return signature
  }

  // this method is called to create transaction that goes into transaction pool,
  // there is no other place to create new transaction,
  // at this point the transaction should be signed and never modified.
  // This should be the only way to create transaction
  async createTransaction({ recipient, amount, fee }) {
    const transaction = new Transaction({
      sender: this.publicKey, recipient, amount, fee,
    })
    transaction.signature = await this.transactionSignature({ transaction })
    return transaction
  }

  // this creates a reward transaction for this wallet.
  // This transaction does not have to be added to the pool
  async createRewardTransaction() {
    const transaction = new Transaction({
      sender: this.publicKey, recipient: config.REWARD_ADDRESS, amount: config.REWARD_AMOUNT, fee: 0,
    })
    transaction.signature = await this.transactionSignature({ transaction })
    return transaction
  }

  async createStakeTransaction({ amount, fee }) {
    const transaction = new Transaction({
      sender: this.publicKey, recipient: config.STAKE_ADDRESS, amount, fee,
    })
    transaction.signature = await this.transactionSignature({ transaction })
    return transaction
  }

  // TODO: TOTEST
  async getAccount() {
    const account = await new Account({ publicKey: this.publicKey }).retrieveThrough()
    return account
  }
}

export default Obj2fsHOC(Wallet)
