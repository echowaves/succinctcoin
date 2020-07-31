const path = require('path')
const fs = require('fs')

const EC = require('elliptic').ec
const crypto = require('crypto')

const ec = new EC('secp256k1')

const { STORE } = require('../config')

class Crypto {
  static hash(...inputs) {
    const hash = crypto.createHash('sha256')
    hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '))
    return hash.digest('hex')
  }

  static verifySignature({ publicKey, data, signature }) {
    const keyFromPublic = ec.keyFromPublic(publicKey, 'hex')
    return keyFromPublic.verify(Crypto.hash(data), signature)
  }

  static getKeyPair() {
    let keyPair
    if (!fs.existsSync(STORE.KEY)) {
      keyPair = ec.genKeyPair()
      fs.writeFileSync(path.resolve(STORE.KEY), JSON.stringify(keyPair))
    }
    const readKey = JSON.parse(fs.readFileSync(path.resolve(STORE.KEY)))

    keyPair = Object.assign(ec.genKeyPair(), readKey)

    return keyPair
  }
}

export default Crypto
