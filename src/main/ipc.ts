import { basename, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, type IpcMainEvent } from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { IpcChannels, type ExportResult, type ImportPreview } from '@shared/ipc'
import type { AppData } from '@shared/types'
import { exportData, exportFileName, importData, ImportError, readImportFile } from './dataTransfer'
import type { Notices } from './notices'
import { perfTime } from './perf'
import { countData } from './storage/counts'
import { migrate } from './storage/migrations'
import type { Storage } from './storage/Storage'

const JSON_FILTER = { name: 'FlungDo-Daten (JSON)', extensions: ['json'] }

// Das Fenster, das die Nachricht geschickt hat – nicht einfach "das erste".
function senderWindow(event: IpcMainEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerIpcHandlers(storage: Storage, notices: Notices): void {
  ipcMain.handle(IpcChannels.dataLoad, () => perfTime('load', () => storage.load()))
  ipcMain.handle(IpcChannels.appNotices, () => notices.take())

  // Daten aus dem Renderer werden vor dem Speichern geprüft – die Datei soll
  // nie in einen ungültigen Zustand geraten.
  ipcMain.handle(IpcChannels.dataSave, (_event, data: unknown) =>
    perfTime('save', () => storage.save(migrate(data)))
  )

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

  // Zwischen Vorschau und Bestätigung liegen die geprüften Daten hier – der Renderer
  // muss sie nicht hin- und herschicken und kann sie nicht verändern.
  let pendingImport: AppData | undefined

  ipcMain.handle(IpcChannels.dataImportPick, async (event): Promise<ImportPreview> => {
    pendingImport = undefined
    const options: OpenDialogOptions = {
      title: 'Daten importieren',
      defaultPath: app.getPath('documents'),
      filters: [JSON_FILTER],
      properties: ['openFile']
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePaths } = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    const filePath = filePaths[0]
    if (canceled || !filePath) return { status: 'canceled' }
    try {
      pendingImport = await readImportFile(filePath)
    } catch (error) {
      if (error instanceof ImportError) return { status: 'invalid', message: error.message }
      throw error
    }
    return { status: 'ready', fileName: basename(filePath), summary: countData(pendingImport) }
  })

  ipcMain.handle(IpcChannels.dataImportConfirm, async (): Promise<AppData> => {
    const data = pendingImport
    if (!data) throw new Error('Kein Import ausgewählt')
    pendingImport = undefined
    await importData(storage, data)
    return data
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
