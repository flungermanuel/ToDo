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
    takeNotices: () => ipcRenderer.invoke(IpcChannels.appNotices),
    onQuickCapture: (listener) => {
      const handler = () => listener()
      ipcRenderer.on(IpcChannels.appQuickCapture, handler)
      return () => ipcRenderer.removeListener(IpcChannels.appQuickCapture, handler)
    }
  },
  capture: {
    analyze: (text, context) => ipcRenderer.invoke(IpcChannels.captureAnalyze, text, context),
    cancel: () => ipcRenderer.send(IpcChannels.captureCancel)
  },
  ai: {
    getStatus: () => ipcRenderer.invoke(IpcChannels.aiStatus),
    setModel: (model) => ipcRenderer.invoke(IpcChannels.aiSetModel, model)
  },
  window: {
    minimize: () => ipcRenderer.send(IpcChannels.windowMinimize),
    toggleMaximize: () => ipcRenderer.send(IpcChannels.windowToggleMaximize),
    close: () => ipcRenderer.send(IpcChannels.windowClose)
  }
}

contextBridge.exposeInMainWorld('api', api)
