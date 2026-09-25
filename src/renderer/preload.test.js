// CAP-10 bridge test. The `electron` mock exposes only the isolated-world
// preload surface (contextBridge + ipcRenderer, NO `app`) — a future
// `electron.app` dependency fails here instead of in the packaged app.
let mockIsDev = false

jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: jest.fn() },
  ipcRenderer: {
    send: jest.fn(),
    sendSync: jest.fn(),
    on: jest.fn(),
  },
}))
jest.mock('electron-is-dev', () => mockIsDev)

// Loads a fresh module registry under the given dev flag and wires the
// mocked sendSync to relay the real app config's DEFAULT_PORT evaluated
// under that flag — the value the main-process '/api/port' handler puts on
// event.returnValue (src/main/api.js).
function loadBridge(isDev) {
  mockIsDev = isDev
  jest.resetModules()

  const electron = require('electron')
  const { DEFAULT_PORT } = require('../config').default

  electron.ipcRenderer.sendSync.mockImplementation(
    channel => (channel === '/api/port' ? DEFAULT_PORT : undefined),
  )
  require('./preload')

  const api = electron.contextBridge.exposeInMainWorld.mock.calls[0][1]
  return { api, electron, DEFAULT_PORT }
}

describe('preload bridge (CAP-10 getApiPort)', () => {
  it('BRIDGE_PROD_PORT: getApiPort() synchronously returns the prod DEFAULT_PORT via sendSync("/api/port")', () => {
    const { api, electron, DEFAULT_PORT } = loadBridge(false)

    expect(DEFAULT_PORT).toBe(3333)
    expect(typeof api.getApiPort).toBe('function')
    expect(api.getApiPort()).toBe(3333)
    expect(electron.ipcRenderer.sendSync).toHaveBeenCalledWith('/api/port')
  })

  it('BRIDGE_DEV_PORT: with electron-is-dev true the main-process port is 3001, sent on the same channel', () => {
    const { api, electron, DEFAULT_PORT } = loadBridge(true)

    expect(DEFAULT_PORT).toBe(3001)
    expect(api.getApiPort()).toBe(3001)
    expect(electron.ipcRenderer.sendSync).toHaveBeenCalledWith('/api/port')
  })

  describe('whitelist routing', () => {
    let api
    let electron

    beforeEach(() => {
      ;({ api, electron } = loadBridge(false))
    })

    it('send("api/blocks") routes to ipcRenderer.send', () => {
      const payload = { a: 1 }

      api.send('api/blocks', payload)

      expect(electron.ipcRenderer.send).toHaveBeenCalledWith('api/blocks', payload)
    })

    it('sendSync("api/wallet-info") routes to ipcRenderer.sendSync', () => {
      electron.ipcRenderer.sendSync.mockReturnValue({ address: 'x' })

      expect(api.sendSync('api/wallet-info')).toEqual({ address: 'x' })
      expect(electron.ipcRenderer.sendSync)
        .toHaveBeenCalledWith('api/wallet-info', undefined)
    })

    it('receive("api/blocks") subscribes via ipcRenderer.on', () => {
      const func = jest.fn()

      api.receive('api/blocks', func)

      expect(electron.ipcRenderer.on)
        .toHaveBeenCalledWith('api/blocks', expect.any(Function))
    })

    it('channels outside the whitelist are not routed (the port channel included)', () => {
      expect(api.send('api/wallet-info', { a: 1 })).toBeUndefined()
      expect(api.sendSync('api/blocks')).toBeUndefined()
      expect(api.sendSync('/api/port')).toBeUndefined()

      expect(electron.ipcRenderer.send).not.toHaveBeenCalled()
      expect(electron.ipcRenderer.sendSync).not.toHaveBeenCalled()
    })
  })
})
