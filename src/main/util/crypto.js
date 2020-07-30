import crypto from 'crypto'
import { ec } from 'elliptic'

const EC = ec.ec

class Crypto {
  static hash(...inputs) {
    const hash = crypto.createHash('sha256')
    hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '))
    return hash.digest('hex')
  }

  static verifySignature({ publicKey, data, signature }) {
    const ec = new EC('secp256k1')

    const keyFromPublic = ec.keyFromPublic(publicKey, 'hex')
    return keyFromPublic.verify(Crypto.hash(data), signature)
  }
}

export default Crypto
