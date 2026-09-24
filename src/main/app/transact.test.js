// The handler under test comes from ../api, which imports the app's
// Electron/libp2p modules; mock the same set as src/main/api.test.js
// (paths adjusted for this file's location under src/main/app/).
jest.mock('electron', () => ({ ipcMain: { on: jest.fn() } }))
jest.mock('electron-is-dev', () => false)
jest.mock('./root-sync', () => jest.fn())
jest.mock('./pubsub', () => jest.fn())

import Blockchain from '../blockchain'
import TransactionPool from '../blockchain/transaction-pool'
import Wallet from '../blockchain/wallet'
import { transact } from '../api'

// AD-10: fund a wallet on a fresh chain via mined reward blocks
// (3 blocks x REWARD_AMOUNT 100 = balance 300). 3 is the ceiling: block.js
// rejects a reward-only block at height > 3 ('Empty data'), so funding via
// reward blocks alone stops at the 4th block.
const fund = async (blockchain, wallet) => {
  for (let index = 0; index < 3; index += 1) {
    await blockchain.addBlock({ data: [], wallet })
  }
}

const stubRes = () => {
  const res = {}

  res.status = jest.fn(code => {
    res.statusCode = code
    return res
  })
  res.json = jest.fn(body => {
    res.body = body
    return res
  })
  return res
}

describe('transact (AD-9 handler)', () => {
  let blockchain
  let wallet
  let pool
  let pubsub
  let recipient

  beforeEach(() => {
    blockchain = new Blockchain()
    wallet = new Wallet()
    pool = new TransactionPool()
    pubsub = { broadcastTransaction: jest.fn() }
    recipient = new Wallet().publicKey
  })

  const invoke = async body => {
    const req = { body }
    const res = stubRes()

    await transact({ blockchain, wallet, transactionPool: pool, pubsub, req, res })
    return res
  }

  it('returns 200 {type: success, transaction} and pools + broadcasts a valid transaction', async () => {
    await fund(blockchain, wallet)

    const res = await invoke({ amount: '50', recipient })

    expect(res.status).not.toHaveBeenCalled()
    expect(res.body.type).toBe('success')
    expect(res.body.transaction).toMatchObject({
      sender: wallet.publicKey,
      recipient,
      amount: '50',
    })
    expect(pool.transactionMap[res.body.transaction.uuid]).toBeDefined()
    expect(pubsub.broadcastTransaction).toHaveBeenCalledTimes(1)
  })

  it('returns 402 insufficient-balance for an unfunded sender and leaves the pool unchanged', async () => {
    const res = await invoke({ amount: '50', recipient })

    expect(res.status).toHaveBeenCalledWith(402)
    expect(res.body).toEqual({ type: 'error', code: 'insufficient-balance', message: 'Amount exceeds balance' })
    expect(Object.keys(pool.transactionMap)).toHaveLength(0)
    expect(pubsub.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('returns 409 duplicate-transaction when the sender already has a pending transaction', async () => {
    await fund(blockchain, wallet)
    const first = await wallet.createTransaction({ recipient, amount: '10', fee: '0.01' })
    pool.setTransaction(first)

    const res = await invoke({ amount: '50', recipient })

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toEqual({ type: 'error', code: 'duplicate-transaction', message: 'Duplicate transactions' })
    expect(Object.keys(pool.transactionMap)).toHaveLength(1)
    expect(pool.transactionMap[first.uuid]).toBeDefined()
    expect(pubsub.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('returns 400 invalid-signature when the created transaction signature is corrupted', async () => {
    await fund(blockchain, wallet)
    const createTransaction = wallet.createTransaction
    wallet.createTransaction = async args => {
      const transaction = await createTransaction.call(wallet, args)

      // corrupt the signature before validation runs
      transaction.signature = 'deadbeef'
      return transaction
    }

    const res = await invoke({ amount: '50', recipient })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toEqual({ type: 'error', code: 'invalid-signature', message: 'Invalid transaction signature' })
    expect(Object.keys(pool.transactionMap)).toHaveLength(0)
    expect(pubsub.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('returns 500 unexpected-error when createTransaction throws a generic error', async () => {
    await fund(blockchain, wallet)
    wallet.createTransaction = async () => {
      throw new Error('boom')
    }

    const res = await invoke({ amount: '50', recipient })

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.body).toEqual({ type: 'error', code: 'unexpected-error', message: 'boom' })
    expect(Object.keys(pool.transactionMap)).toHaveLength(0)
    expect(pubsub.broadcastTransaction).not.toHaveBeenCalled()
  })

  it('returns 400 invalid-transaction for a malformed amount before creating a transaction', async () => {
    await fund(blockchain, wallet)
    const createSpy = jest.spyOn(wallet, 'createTransaction')

    const res = await invoke({ amount: 'abc', recipient })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toEqual({ type: 'error', code: 'invalid-transaction', message: 'Amount invalid' })
    expect(createSpy).not.toHaveBeenCalled()
    expect(Object.keys(pool.transactionMap)).toHaveLength(0)
    expect(pubsub.broadcastTransaction).not.toHaveBeenCalled()
  })
})
