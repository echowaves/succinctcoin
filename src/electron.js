const url = require('url')
const path = require('path')

const electron = require("electron")

const { app, BrowserWindow, } = electron

const isDev = require("electron-is-dev")
// const { channels, } = require('./constants')

let mainWindow

function createMainWindow() {
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

  // mainWindow.loadURL(
  //   isDev
  //     ? "http://localhost:3000"
  //     : `${electron.app.getAppPath()}../build/index.html`
  // )

  let indexPath

  if (isDev && process.argv.indexOf('--noDevServer') === -1) {
    indexPath = url.format({
      protocol: 'http:',
      host: 'localhost:3000',
      pathname: 'index.html',
      slashes: true,
    })
  } else {
    indexPath = url.format({
      protocol: 'file:',
      pathname: path.join(__dirname, '../build', 'index.html'),
      slashes: true,
    })
  }

  mainWindow.loadURL(indexPath)

  // mainWindow.on("closed", () => (mainWindow = null))
}

app.on('ready', () => {
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
// ipcMain.on(channels.APP_INFO, event => {
//   event.sender.send(channels.APP_INFO, {
//     appName: app.getName(),
//     appVersion: app.getVersion(),
//   })
// })
