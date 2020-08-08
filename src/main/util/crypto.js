const crypto = require('crypto')

class Crypto {
  static hash(...inputs) {
    const hash = crypto.createHash('sha256')
    hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '))
    return hash.digest('hex')
  }

  static verifySignature({ publicKey, data, signature }) {
    const verify = crypto.createVerify('SHA256')
    verify.write(Crypto.hash(data))
    verify.end()
    return verify.verify(publicKey, signature, 'hex')
  }
}

export default Crypto
