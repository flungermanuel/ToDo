import { BrowserWindow, ipcMain, type IpcMainEvent } from 'electron'
import { IpcChannels } from '@shared/ipc'
import { migrate } from './storage/migrations'
import type { Storage } from './storage/Storage'

// Das Fenster, das die Nachricht geschickt hat – nicht einfach "das erste".
function senderWindow(event: IpcMainEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerIpcHandlers(storage: Storage): void {
  ipcMain.handle(IpcChannels.dataLoad, () => storage.load())

  // Daten aus dem Renderer werden vor dem Speichern geprüft – die Datei soll
  // nie in einen ungültigen Zustand geraten.
  ipcMain.handle(IpcChannels.dataSave, (_event, data: unknown) => storage.save(migrate(data)))

  ipcMain.on(IpcChannels.windowMinimize, (event) => senderWindow(event)?.minimize())

  ipcMain.on(IpcChannels.windowToggleMaximize, (event) => {
    const win = senderWindow(event)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.on(IpcChannels.windowClose, (event) => senderWindow(event)?.close())
}
