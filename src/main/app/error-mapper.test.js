import BlockchainError from '../blockchain/errors'

import mapErrorToResponse from './error-mapper'

describe('mapErrorToResponse (AD-9)', () => {
  const documented = [
    ['duplicate-transaction', 409],
    ['insufficient-balance', 402],
    ['invalid-transaction', 400],
    ['invalid-signature', 400],
    ['invalid-hash', 400],
  ]

  it.each(documented)('maps %s to status %i', (code, status) => {
    const { status: mapped, body } = mapErrorToResponse(new BlockchainError('message', code))

    expect(mapped).toBe(status)
    expect(body).toEqual({ type: 'error', code, message: 'message' })
  })

  it('maps an error with an undocumented code to 500 unexpected-error', () => {
    const { status, body } = mapErrorToResponse(new BlockchainError('weird', 'some-other-code'))

    expect(status).toBe(500)
    expect(body).toEqual({ type: 'error', code: 'unexpected-error', message: 'weird' })
  })

  it('maps an untyped Error to 500 unexpected-error', () => {
    const { status, body } = mapErrorToResponse(new Error('boom'))

    expect(status).toBe(500)
    expect(body).toEqual({ type: 'error', code: 'unexpected-error', message: 'boom' })
  })

  it('maps a missing error to a safe 500 envelope', () => {
    const { status, body } = mapErrorToResponse(null)

    expect(status).toBe(500)
    expect(body).toEqual({ type: 'error', code: 'unexpected-error', message: 'Internal server error' })
  })

  it('always returns the {type, code, message} envelope', () => {
    const { body } = mapErrorToResponse(new BlockchainError('m', 'insufficient-balance'))

    expect(Object.keys(body).sort()).toEqual(['code', 'message', 'type'])
    expect(body.type).toBe('error')
  })
})
