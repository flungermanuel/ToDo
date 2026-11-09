import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels, type Api } from '@shared/ipc'

// Einzige Brücke zwischen Renderer und Main. Der Renderer sieht nur diese
// Funktionen – kein ipcRenderer, kein Node.
const api: Api = {
  data: {
    load: () => ipcRenderer.invoke(IpcChannels.dataLoad),
    save: (data) => ipcRenderer.invoke(IpcChannels.dataSave, data),
    exportToFile: () => ipcRenderer.invoke(IpcChannels.dataExport),
    pickImportFile: () => ipcRenderer.invoke(IpcChannels.dataImportPick),
    confirmImport: () => ipcRenderer.invoke(IpcChannels.dataImportConfirm)
  },
  app: {
    takeNotices: () => ipcRenderer.invoke(IpcChannels.appNotices)
  },
  window: {
    minimize: () => ipcRenderer.send(IpcChannels.windowMinimize),
    toggleMaximize: () => ipcRenderer.send(IpcChannels.windowToggleMaximize),
    close: () => ipcRenderer.send(IpcChannels.windowClose)
  }
}

contextBridge.exposeInMainWorld('api', api)
