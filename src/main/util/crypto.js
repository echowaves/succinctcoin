const crypto = require('crypto')
const ecrypto = require('@noble/secp256k1')

function Crypto() {}

/**
 * Canonicalize a value for hashing by sorting the own keys of every plain
 * object. Used as the JSON.stringify replacer, so it inherits stringify's
 * serializer semantics (toJSON for Dates, dropping undefined properties) and
 * lets stringify's recursion handle arrays and nested objects at every depth.
 * Arrays keep element order; scalars pass through unchanged.
 * @param {string} key - the current key (unused; required by the replacer signature)
 * @param {*} value - the current value (post-toJSON)
 * @returns {*} a NEW object with sorted own-key insertion order for plain
 *   objects; the value unchanged for arrays, scalars, and null
 */
function sortKeysDeep(key, value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value).sort().reduce((acc, k) => {
      acc[k] = value[k]
      return acc
    }, {})
  }
  return value
}

Crypto.hash = function (...inputs) {
  const hash = crypto.createHash('sha512')
  hash.update(inputs.map(input => JSON.stringify(input, sortKeysDeep)).sort().join(' '))
  return hash.digest('hex')
}

/**
 * Convert a hex string to a Uint8Array.
 * @param {string} hex
 * @returns {Uint8Array}
 */
Crypto.hexToBytes = function (hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
   }
  return bytes
}

/**
 * Convert a Uint8Array to a hex string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
Crypto.bytesToHex = function (bytes) {
  return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
}

/**
 * Verify an ECDSA signature using @noble/secp256k1.
 * @param {{ publicKey: string, data: *, signature: string }}
 * @returns {boolean}
 */
Crypto.verifySignature = async function ({ publicKey, data, signature }) {
  const hash = Crypto.hash(data)
  const msgBytes = Crypto.hexToBytes(hash)
  const sigBytes = Crypto.hexToBytes(signature)
  const pubBytes = Crypto.hexToBytes(publicKey)
  return ecrypto.verifyAsync(sigBytes, msgBytes, pubBytes)
}

/**
 * Check if a string is a valid secp256k1 public key in hex format.
 * Uncompressed: 130 hex chars (04 + 32 + 32)
 * Compressed: 66 hex chars (02/03 + 32)
 * @param {{ publicKey: string }}
 * @returns {boolean}
 */
Crypto.isPublicKey = function ({ publicKey }) {
  if (!publicKey || typeof publicKey !== 'string') return false
  const len = publicKey.length
  if (len !== 64 && len !== 66 && len !== 130) return false
  return /^[0-9a-fA-F]+$/.test(publicKey)
}
export default Crypto
