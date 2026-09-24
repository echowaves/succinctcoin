// AD-9: the core's typed error primitive. The core throws BlockchainError
// with a stable string `code` and never names an HTTP status — the app
// layer (src/main/app/error-mapper.js) owns all status mapping. Messages
// stay human-readable; the code is the stable machine-readable identity.

// Stable error codes the core throws. This is the documented code set —
// the app maps exactly these to HTTP statuses.
const ERROR_CODES = {
  DUPLICATE_TRANSACTION: 'duplicate-transaction',
  INSUFFICIENT_BALANCE: 'insufficient-balance',
  INVALID_TRANSACTION: 'invalid-transaction',
  INVALID_SIGNATURE: 'invalid-signature',
  INVALID_HASH: 'invalid-hash',
}

class BlockchainError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'BlockchainError'
    this.code = code
  }
}

export { ERROR_CODES }
export default BlockchainError
