const EC = require('elliptic').ec
const crypto = require('crypto')

class Crypto {
  static ec = new EC('secp256k1')

  static hash(...inputs) {
    const hash = crypto.createHash('sha256')
    hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '))
    return hash.digest('hex')
  }

  static verifySignature({ publicKey, data, signature }) {
    const keyFromPublic = Crypto.ec.keyFromPublic(publicKey, 'hex')
    return keyFromPublic.verify(Crypto.hash(data), signature)
  }

  static genKeyPair() {
    return Crypto.ec.genKeyPair()
  }
}

export default Crypto
