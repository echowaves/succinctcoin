import Obj2fsHOC from 'obj2fs-hoc'

import Crypto from '../util/crypto'
import config from '../config'

import Transaction from './transaction'
import Account from './account'

// Use dynamic imports for ESM-only packages to work with Jest's CJS environment
// Babel transforms these into Promise-based require() calls
const libp2pCryptoKeys = () => import('@libp2p/crypto/keys')
const libp2pPeerId = () => import('@libp2p/peer-id')

const crypto = require('crypto')
const path = require('path')

const Big = require('big.js')



class Wallet {
  constructor() {
    // this is only one wallet per running application, so it's OK to hard code it here
    this.key = path.resolve(config.STORE.WALLET)

    // Use secp256k1 for both signing and libp2p peer identity
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
  }

  /**
   * Returns the libp2p PeerId derived from this wallet's public key.
   * Used for ENR generation and discv5 peer discovery.
   * @returns {Promise<import('@libp2p/interface').PeerId>}
   */
  async getPeerId() {
    const { publicKeyFromRaw } = await libp2pCryptoKeys()
    const { peerIdFromPublicKey } = await libp2pPeerId()
    const rawPubKey = this.publicKey.export({ type: 'spki', format: 'pem' })
    // Convert PEM SPKI to raw secp256k1 public key bytes
    const spki = crypto.createPublicKey(this.publicKey)
    const der = spki.export({ type: 'spki', format: 'der' })
    // secp256k1 uncompressed public key: 04 + 32 bytes x + 32 bytes y
    const raw = this._derToUncompressed(der)
    const libp2pPubKey = publicKeyFromRaw(raw, 'secp256k1')
    return peerIdFromPublicKey(libp2pPubKey)
  }

  /**
   * Convert DER-encoded SPKI to uncompressed secp256k1 public key.
   * secp256k1 SPKI DER: 04 64 <32 bytes x> <32 bytes y>
   * @param {Buffer} der
   * @returns {Buffer}
   */
  _derToUncompressed(der) {
    // secp256k1 public key in SPKI format:
    // 0x30 0x59 0x30 0x13 0x06 0x07 0x2A 0x86 0x48 0xCE 0x3D 0x02 0x01
    // 0x06 0x08 0x2A 0x86 0x48 0xCE 0x3D 0x03 0x01 0x07 0x03 0x42 0x00
    // <65 bytes uncompressed point>
    // Skip the SPKI header (30 bytes for secp256k1) to get the raw point
    const headerLen = 30
    if (der.length < headerLen + 65) {
      throw new Error('Invalid SPKI length for secp256k1')
    }
    return der.slice(headerLen)
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
      Big(transaction.amount).valueOf(), Big(transaction.fee).valueOf(),
    ])
    return signature
  }

  // this method is called to create transaction that goes into transaction pool,  // there is no other place to create new transaction,
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
  async getAccount() {
    const account = await new Account({ publicKey: this.publicKey }).retrieveThrough()
    return account
  }
}

export default Obj2fsHOC(Wallet)
