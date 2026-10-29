import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels, type Api } from '@shared/ipc'

// Einzige Brücke zwischen Renderer und Main. Der Renderer sieht nur diese
// Funktionen – kein ipcRenderer, kein Node.
const api: Api = {
  window: {
    minimize: () => ipcRenderer.send(IpcChannels.windowMinimize),
    toggleMaximize: () => ipcRenderer.send(IpcChannels.windowToggleMaximize),
    close: () => ipcRenderer.send(IpcChannels.windowClose)
  }
}

contextBridge.exposeInMainWorld('api', api)
