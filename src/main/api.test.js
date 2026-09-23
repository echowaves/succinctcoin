jest.mock('electron', () => ({ ipcMain: { on: jest.fn() } }))
jest.mock('electron-is-dev', () => false)
jest.mock('./app/root-sync', () => jest.fn())
jest.mock('./app/pubsub', () => jest.fn())

import globalConfig from '../config'

import syncRootState from './app/root-sync'
import api from './api'
import Blockchain from './blockchain'
import TransactionPool from './blockchain/transaction-pool'

describe('api.syncWithRootState (AD-5/AD-13 root-sync wiring)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn(() => Promise.resolve({ json: async () => ({}) }))
  })

  it('delegates to the root-sync module with the app singletons and the root fetch endpoints', async () => {
    await api.syncWithRootState()
    const firstCall = syncRootState.mock.calls[0][0]

    expect(syncRootState).toHaveBeenCalledTimes(1)
    expect(firstCall.blockchain).toBeInstanceOf(Blockchain)
    expect(firstCall.transactionPool).toBeInstanceOf(TransactionPool)

    await api.syncWithRootState()
    const secondCall = syncRootState.mock.calls[1][0]
    expect(secondCall.blockchain).toBe(firstCall.blockchain)
    expect(secondCall.transactionPool).toBe(firstCall.transactionPool)

    await firstCall.fetchRootChain()
    await firstCall.fetchRootPool()

    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch)
      .toHaveBeenNthCalledWith(1, `${globalConfig.ROOT_NODE_ADDRESS}/api/blocks`)
    expect(global.fetch)
      .toHaveBeenNthCalledWith(2, `${globalConfig.ROOT_NODE_ADDRESS}/api/transaction-pool-map`)
  })
})
