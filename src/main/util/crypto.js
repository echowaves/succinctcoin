const EC = require('elliptic').ec
const crypto = require('crypto')

const ec = new EC('secp256k1')

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
    return ec.genKeyPair()
  }
}

export default Crypto
