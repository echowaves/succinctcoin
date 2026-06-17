// See the Electron documentation for details on how to use preload scripts:
const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    // whitelist channels
    const validChannels = ['api/blocks']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  sendSync: (channel, data) => {
    const validChannels = ['api/wallet-info']
    if (validChannels.includes(channel)) {
      return ipcRenderer.sendSync(channel, data)
    }
  },
  receive: (channel, func) => {
    const validChannels = ['api/blocks']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
})

// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
console.log('!!!!!!!!!!!!!!!!!!!!!!!!! preload !!!!!!!!!!!!!!!!!!!!!!!!!')
