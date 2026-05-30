// See the Electron documentation for details on how to use preload scripts:
window.ipcRenderer = require('electron').ipcRenderer
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
console.log('!!!!!!!!!!!!!!!!!!!!!!!!! preload !!!!!!!!!!!!!!!!!!!!!!!!!')