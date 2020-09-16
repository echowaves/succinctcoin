import { format as formatUrl } from 'url'

import api from './api.js' // express app

import globalConfig from '../config'

const path = require('path')

const electron = require("electron")

const { app, BrowserWindow } = electron

const isDev = require("electron-is-dev")

let mainWindow

function createMainWindow() {
  api.api.listen(globalConfig.DEFAULT_PORT, () => {
    console.log(`listening at localhost:${globalConfig.DEFAULT_PORT}`) // eslint-disable-line no-console

    api.syncWithRootState()
  })

  mainWindow = new BrowserWindow({
    title: 'APP NAME',
    width: isDev ? 1600 : 800,
    height: 800,
    backgroundColor: 'white',
    webPreferences: {
      nodeIntegration: true,
    },
  })

  // use this to open dev tools manualy to debug
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  if (isDev) {
    mainWindow.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
  } else {
    mainWindow.loadURL(formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true,
    }))
  }
}

app.on('ready', () => {
  // api.api()
  createMainWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})
