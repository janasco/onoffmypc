'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// Context-isolated bridge: the renderer (loaded from a local file, but still
// treated as untrusted per Electron's security guidance) only gets this one
// narrow method, never direct Node/IPC access.
contextBridge.exposeInMainWorld('onoffmypc', {
  pair: (code) => ipcRenderer.invoke('pair', code),
})
