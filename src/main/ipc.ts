import { BrowserWindow, ipcMain, type IpcMainEvent } from 'electron'
import { IpcChannels } from '@shared/ipc'

// Das Fenster, das die Nachricht geschickt hat – nicht einfach "das erste".
function senderWindow(event: IpcMainEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerIpcHandlers(): void {
  ipcMain.on(IpcChannels.windowMinimize, (event) => senderWindow(event)?.minimize())

  ipcMain.on(IpcChannels.windowToggleMaximize, (event) => {
    const win = senderWindow(event)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.on(IpcChannels.windowClose, (event) => senderWindow(event)?.close())
}
