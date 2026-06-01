// Mock @noble/secp256k1 v3.1.0 for Jest tests
// Real API: keygen(), getPublicKey(), signAsync(), verifyAsync()
// All inputs/outputs are Uint8Array
const crypto = require('crypto')

// Cache: privKeyHex -> { keyPair, pubBytesUncompressed }
const keyCache = new Map()

function getPrivHex(privateKey) {
  if (privateKey instanceof Uint8Array || Buffer.isBuffer(privateKey)) {
    return Buffer.from(privateKey).toString('hex')
  }
  return privateKey
}

function mockKeygen() {
  const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' })
  // Extract raw 32-byte private key from DER
  const privKeyDer = keyPair.privateKey.export({ type: 'pkcs8', format: 'der' })
  const hex = privKeyDer.toString('hex')
  const idx = hex.indexOf('0420')
  const rawPrivKey = privKeyDer.slice((idx / 2) + 2, (idx / 2) + 34)
  // Extract raw public key bytes (uncompressed, 65 bytes) from SPKI DER
  const spkiDer = keyPair.publicKey.export({ type: 'spki', format: 'der' })
  const bitStringStart = spkiDer.indexOf(0x03)
  const rawPubUncompressed = spkiDer.slice(bitStringStart + 3)
  const privKeyHex = rawPrivKey.toString('hex')
  keyCache.set(privKeyHex, {
    keyPair,
    pubBytesUncompressed: new Uint8Array(rawPubUncompressed),
  })
  // Real API returns compressed (33 bytes) publicKey from keygen()
  const x = rawPubUncompressed.slice(1, 33)
  const y = rawPubUncompressed[rawPubUncompressed.length - 1]
  const prefix = (y & 1) === 0 ? 0x02 : 0x03
  const compressed = Buffer.alloc(33)
  compressed[0] = prefix
  x.copy(compressed, 1)
  return {
    secretKey: new Uint8Array(rawPrivKey),
    publicKey: new Uint8Array(compressed),
  }
}

function mockGetPublicKey(privateKey, compressed) {
  const privKeyHex = getPrivHex(privateKey)
  const entry = keyCache.get(privKeyHex)
  if (!entry) throw new Error('Private key not found in cache')
  if (compressed) {
    const uncompressed = Buffer.from(entry.pubBytesUncompressed)
    const x = uncompressed.slice(1, 33)
    const y = uncompressed[uncompressed.length - 1]
    const prefix = (y & 1) === 0 ? 0x02 : 0x03
    const result = Buffer.alloc(33)
    result[0] = prefix
    x.copy(result, 1)
    return new Uint8Array(result)
  }
  return entry.pubBytesUncompressed
}

async function mockSignAsync(message, privateKey) {
  const privKeyHex = getPrivHex(privateKey)
  const entry = keyCache.get(privKeyHex)
  if (!entry) throw new Error('Private key not found in cache')
  const msgBuf = Buffer.from(message)
  const sign = crypto.sign('sha256', msgBuf, {
    key: entry.keyPair.privateKey,
    dsaEncoding: 'ieee-p1363',
  })
  return new Uint8Array(sign)
}

async function mockVerifyAsync(signature, message, publicKey) {
  const sigBuf = Buffer.from(signature)
  const msgBuf = Buffer.from(message)
  const pubHex = Buffer.from(publicKey).toString('hex')
  let keyPair = null
  for (const [privHex, entry] of keyCache.entries()) {
    const entryPubHex = Buffer.from(entry.pubBytesUncompressed).toString('hex')
    if (entryPubHex === pubHex) {
      keyPair = entry.keyPair
      break
    }
  }
  if (!keyPair) return false
  try {
    return crypto.verify('sha256', msgBuf, {
      key: keyPair.publicKey,
      dsaEncoding: 'ieee-p1363',
    }, sigBuf)
  } catch (e) {
    return false
  }
}

function mockVerify(signature, message, publicKey) {
  const sigBuf = Buffer.from(signature)
  const msgBuf = Buffer.from(message)
  const pubHex = Buffer.from(publicKey).toString('hex')
  let keyPair = null
  for (const [privHex, entry] of keyCache.entries()) {
    const entryPubHex = Buffer.from(entry.pubBytesUncompressed).toString('hex')
    if (entryPubHex === pubHex) {
      keyPair = entry.keyPair
      break
    }
  }
  if (!keyPair) return false
  try {
    return crypto.verify('sha256', msgBuf, {
      key: keyPair.publicKey,
      dsaEncoding: 'ieee-p1363',
    }, sigBuf)
  } catch (e) {
    return false
  }
}

module.exports = {
  keygen: mockKeygen,
  getPublicKey: mockGetPublicKey,
  signAsync: mockSignAsync,
  verify: mockVerify,
  verifyAsync: mockVerifyAsync,
}
