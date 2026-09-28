jest.mock('electron', () => ({ ipcMain: { on: jest.fn() } }))
jest.mock('electron-is-dev', () => false)
jest.mock('./app/root-sync', () => jest.fn())
jest.mock('./app/pubsub', () => jest.fn())
// CAP-12 startup fail-fast row: the init row's corrupt-fixture write must not
// touch the shared .test/wallet that wallet.test.js owns (cross-suite race),
// so the main config's wallet-store path — consumed as `config.STORE.WALLET`
// through the default export — is redirected, for this suite only, to a
// per-worker tmp file. Every other config field is the real one.
jest.mock('./config', () => {
  const actual = jest.requireActual('./config')
  const realConfig = actual && actual.default ? actual.default : actual
  const tmpWallet = require('path').join(
    require('os').tmpdir(),
    `succinctcoin-api-${process.pid}-worker-${process.env.JEST_WORKER_ID || 0}`,
    'wallet',
  )
  const patchedConfig = {
    ...realConfig,
    STORE: {
      ...realConfig.STORE,
      WALLET: tmpWallet,
    },
  }
  return { __esModule: true, default: patchedConfig }
})

import globalConfig from '../config'

import syncRootState from './app/root-sync'
import api, { walletExport, walletRestore } from './api'
import Blockchain from './blockchain'
import TransactionPool from './blockchain/transaction-pool'

// Captured at module scope (before any beforeEach): importing ./api
// registers the ipcMain handlers, and beforeEach's jest.clearAllMocks()
// would otherwise erase the registration history.
const { ipcMain } = require('electron')
const portRegistration = ipcMain.on.mock.calls.find(([channel]) => channel === '/api/port')
const registeredChannels = ipcMain.on.mock.calls.map(([channel]) => channel)

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

  it('CAP-12 IPC wiring: /api/wallet-export and /api/wallet-restore handlers are registered', () => {
    expect(registeredChannels).toContain('/api/wallet-export')
    expect(registeredChannels).toContain('/api/wallet-restore')
  })
})

describe('api.walletExport / api.walletRestore (CAP-12 key custody)', () => {
  // KEY SEPARATION (rli-1): restoreBackup() PERSISTS the restored identity,
  // so a restore-row wallet with the default key would write the SHARED
  // jest fixture .test/wallet and race wallet.test.js under parallel
  // workers. Give every restore-row wallet a worker-unique tmp key via the
  // HOC setKey(); the export rows use plain in-memory wallets (export never
  // touches the file).
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const cryptoLib = require('crypto')
  const Wallet = require('./blockchain/wallet').default

  let tmpDir
  beforeAll(() => {
    tmpDir = fs.mkdtempSync(os.tmpdir().concat('/succinctcoin-restore-'))
  })
  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  const tmpKeyedWallet = () => new Wallet().setKey(path.join(
    tmpDir,
    `wallet-${cryptoLib.randomUUID()}`,
  ))

  describe('walletExport()', () => {
    it('returns { backup } matching the wire format on a valid password', () => {
      const result = walletExport({ wallet: new Wallet(), password: 'seal-the-deal' })
      expect(result.backup).toMatch(/^succinctcoin-backup-v1:[A-Za-z0-9+/]+={0,2}$/)
    })

    it('returns the typed { code, message } shape on an invalid password', () => {
      const result = walletExport({ wallet: new Wallet(), password: '' })
      expect(result).toEqual({ code: 'invalid-backup', message: expect.any(String) })
      expect(result.backup).toBeUndefined()
    })
  })

  describe('walletRestore()', () => {
    it('round-trips a backup to the same public key (on a tmp-keyed wallet)', () => {
      const exportWallet = new Wallet()
      const { backup } = walletExport({ wallet: exportWallet, password: 'round-trip' })
      const restoredWallet = tmpKeyedWallet()
      expect(restoredWallet.publicKey).not.toBe(exportWallet.publicKey)

      const result = walletRestore({ wallet: restoredWallet, backup, password: 'round-trip' })

      expect(result.publicKey).toBe(exportWallet.publicKey)
      expect(result.publicKey).toMatch(/^04[0-9a-f]{128}$/)
      expect(restoredWallet.privateKey).toBe(exportWallet.privateKey)
      // rli-1: the restored identity persisted to the wallet's (tmp) key
      const persisted = JSON.parse(fs.readFileSync(restoredWallet.key, 'utf8'))
      expect(persisted).toEqual({
        privateKey: exportWallet.privateKey,
        publicKey: exportWallet.publicKey,
      })
    })

    it('returns the typed failure shape on a wrong password and leaves keys unchanged', () => {
      const { backup } = walletExport({ wallet: new Wallet(), password: 'right' })
      const restoreWallet = tmpKeyedWallet()
      const original = { privateKey: restoreWallet.privateKey, publicKey: restoreWallet.publicKey }

      const result = walletRestore({ wallet: restoreWallet, backup, password: 'wrong' })

      expect(result).toEqual({ code: 'invalid-backup', message: expect.any(String) })
      expect(result.publicKey).toBeUndefined()
      expect(restoreWallet.privateKey).toBe(original.privateKey)
      expect(restoreWallet.publicKey).toBe(original.publicKey)
      expect(fs.existsSync(restoreWallet.key)).toBe(false) // no persist on failure
    })
  })
})

// CAP-12 startup contract, exercised at the production call site (the LOAD_*
// rows test load() directly; this row tests the strict load THROUGH init):
// a corrupted wallet file REJECTS api.init() with a typed corrupted-wallet
// before any identity is used — a catch-and-continue regression such as
// `load().catch(() => new Wallet())` turns this row red. Runs last in the
// file: on success the module-level wallet in api.js stays unset, which no
// earlier row depends on. (The init path stops at the wallet load — the
// rejection predates the account/pubsub/miner construction, so no app
// side effects are started.)
describe('api.init() — CAP-12 startup fail-fast', () => {
  const fs = require('fs')
  const path = require('path')
  const mainConfig = require('./config').default

  const walletFile = () => path.resolve(mainConfig.STORE.WALLET)

  afterEach(() => {
    if (fs.existsSync(walletFile())) fs.unlinkSync(walletFile())
  })

  it('corrupt wallet file: init() rejects with typed corrupted-wallet and no fresh identity is used', async () => {
    const file = walletFile()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, 'this is not json{', 'utf8')

    await expect(api.init()).rejects.toMatchObject({
      code: 'corrupted-wallet',
      name: 'BlockchainError',
      message: expect.stringContaining('not valid JSON'),
    })
  })
})
