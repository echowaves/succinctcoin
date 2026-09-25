jest.mock('electron', () => ({ ipcMain: { on: jest.fn() } }))
jest.mock('electron-is-dev', () => false)
jest.mock('./app/root-sync', () => jest.fn())
jest.mock('./app/pubsub', () => jest.fn())

import globalConfig from '../config'

import syncRootState from './app/root-sync'
import api from './api'
import Blockchain from './blockchain'
import TransactionPool from './blockchain/transaction-pool'

// Captured at module scope (before any beforeEach): importing ./api
// registers the ipcMain handlers, and beforeEach's jest.clearAllMocks()
// would otherwise erase the registration history.
const { ipcMain } = require('electron')
const portRegistration = ipcMain.on.mock.calls.find(([channel]) => channel === '/api/port')

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

  it('PORT_HANDLER: the /api/port ipcMain handler answers the synchronous pull with the app-config DEFAULT_PORT', () => {
    expect(portRegistration).toBeDefined()
    expect(portRegistration[0]).toBe('/api/port')

    const event = {}
    portRegistration[1](event)

    expect(event.returnValue).toBe(3333)
    expect(event.returnValue).toBe(globalConfig.DEFAULT_PORT)
  })
})
