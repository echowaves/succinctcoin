const crypto = require('crypto')

function Crypto() {}

Crypto.hash = function (...inputs) {
  const hash = crypto.createHash('sha512')
  hash.update(inputs.map(input => JSON.stringify(input)).sort().join(' '))
  return hash.digest('hex')
}
Crypto.verifySignature = function ({ publicKey, data, signature }) {
  const verify = crypto.createVerify('SHA512')
  verify.write(Crypto.hash(data))
  verify.end()
  return verify.verify(publicKey, signature, 'hex')
}

Crypto.isPublicKey = function ({ publicKey }) {
  if (
    publicKey
    && publicKey.length === 178
    && publicKey.startsWith("-----BEGIN PUBLIC KEY-----\n")
    && publicKey.endsWith("\n-----END PUBLIC KEY-----\n")
  ) {
    return true
  }
  return false
}

export default Crypto
