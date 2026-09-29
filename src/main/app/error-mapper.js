// AD-9: the single owner of the error -> HTTP response mapping. The core
// (src/main/blockchain/) throws typed errors with a stable `code` and no
// HTTP knowledge; this app-layer mapper is the only place that knows
// statuses. It keys off the `code` property only (duck-typed) — it does
// not import the error class, only the documented code set, which keeps
// the mapping table in one place.

const STATUS_BY_CODE = {
  'duplicate-transaction': 409,
  'insufficient-balance': 402,
  'invalid-transaction': 400,
  'invalid-signature': 400,
  'invalid-hash': 400,
}

const UNEXPECTED_CODE = 'unexpected-error'

// Maps a thrown error to the documented envelope
// { status, body: { type: 'error', code, message } }. A documented code
// keeps its code and uses the mapped status; anything else (untyped or
// undocumented) is an unexpected error: 500 / unexpected-error.
function mapErrorToResponse(error) {
  const message = error && typeof error.message === 'string' ? error.message : 'Internal server error'
  const code = error && typeof error.code === 'string' ? error.code : UNEXPECTED_CODE
  // hasOwn guards against prototype-chain keys (e.g. code === 'constructor')
  // resolving to a non-number and being passed to res.status().
  const status = Object.hasOwn(STATUS_BY_CODE, code) ? STATUS_BY_CODE[code] : undefined

  return {
    status: status || 500,
    body: {
      type: 'error',
      code: status ? code : UNEXPECTED_CODE,
      message,
    },
  }
}

export default mapErrorToResponse
