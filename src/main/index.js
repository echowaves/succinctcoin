import { format as formatUrl } from 'url'

import api from './api.js' // express app

import globalConfig from '../config'

const path = require('path')

const electron = require("electron")

const { app, BrowserWindow } = electron

const isDev = require("electron-is-dev")

let mainWindow

// app.disableHardwareAcceleration()

const createMainWindow = async () => {
  await api.init()

  api.api.listen(globalConfig.DEFAULT_PORT, async () => {
    console.log(`listening at localhost:${globalConfig.DEFAULT_PORT}`) // eslint-disable-line no-console
    await api.syncWithRootState()
  })

  mainWindow = new BrowserWindow({
    title: 'APP NAME',
    width: isDev ? 1600 : 800,
    height: 800,
    backgroundColor: 'white',
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
    },
  })

  // use this to open dev tools manualy to debug
  if (isDev) {
    try {
      mainWindow.webContents.openDevTools()
      await mainWindow.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
      console.log('opened window with dev tools ----------------------------------------------')
    } catch (error) {
      console.log("error happened ---------------------------------------------------")
      console.log(error)
    }
  } else {
    await mainWindow.loadURL(formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true,
    }))
  }
}

app.on('ready', async () => {
  // api.api()
  await createMainWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow()
  }
})
