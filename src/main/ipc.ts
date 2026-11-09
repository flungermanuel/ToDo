import { basename, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, type IpcMainEvent } from 'electron'
import type { SaveDialogOptions } from 'electron'
import { IpcChannels, type ExportResult } from '@shared/ipc'
import { exportData, exportFileName } from './dataTransfer'
import { migrate } from './storage/migrations'
import type { Storage } from './storage/Storage'

const JSON_FILTER = { name: 'FlungDo-Daten (JSON)', extensions: ['json'] }

// Das Fenster, das die Nachricht geschickt hat – nicht einfach "das erste".
function senderWindow(event: IpcMainEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerIpcHandlers(storage: Storage): void {
  ipcMain.handle(IpcChannels.dataLoad, () => storage.load())

  // Daten aus dem Renderer werden vor dem Speichern geprüft – die Datei soll
  // nie in einen ungültigen Zustand geraten.
  ipcMain.handle(IpcChannels.dataSave, (_event, data: unknown) => storage.save(migrate(data)))

  // Der Dialog läuft in Main: Der Renderer bekommt nie einen Dateipfad in die Hand,
  // nur den Dateinamen zur Anzeige.
  ipcMain.handle(IpcChannels.dataExport, async (event): Promise<ExportResult> => {
    const options: SaveDialogOptions = {
      title: 'Daten exportieren',
      defaultPath: join(app.getPath('documents'), exportFileName(new Date())),
      filters: [JSON_FILTER]
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePath } = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options)
    if (canceled || !filePath) return { status: 'canceled' }
    await exportData(storage, filePath)
    return { status: 'saved', fileName: basename(filePath) }
  })

  ipcMain.on(IpcChannels.windowMinimize, (event) => senderWindow(event)?.minimize())

  ipcMain.on(IpcChannels.windowToggleMaximize, (event) => {
    const win = senderWindow(event)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.on(IpcChannels.windowClose, (event) => senderWindow(event)?.close())
}
