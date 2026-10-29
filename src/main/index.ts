import { join } from 'node:path'
import { app, BrowserWindow, nativeTheme } from 'electron'
import { registerIpcHandlers } from './ipc'
import { JsonStorage } from './storage/JsonStorage'
import { adoptLegacyFile } from './storage/legacy'
import type { Storage } from './storage/Storage'

// Muss zu --bg in globals.css passen, sonst blitzt beim Start kurz eine andere Farbe auf.
const BACKGROUND = { light: '#f5f5f7', dark: '#1c1c1e' }

const APP_NAME = 'FlungDo'
const DATA_FILE = 'todo-data.json'

// Daten-Ordner fest auf %APPDATA%/FlungDo setzen – unabhängig davon, wie Electron
// den Namen gerade ableitet (Dev-Modus vs. gebaute .exe).
app.setName(APP_NAME)
app.setPath('userData', join(app.getPath('appData'), APP_NAME))

function createWindow(): void {
  const win = new BrowserWindow({
    title: APP_NAME,
    width: 1100,
    height: 720,
    minWidth: 760,
    minHeight: 520,
    show: false,
    // Ohne Windows-Rahmen: Titelleiste und Fensterknöpfe zeichnen wir selbst.
    frame: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Sicherheit: Renderer bekommt keinen Node-Zugriff, nur was preload freigibt.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Erst anzeigen, wenn der Inhalt gerendert ist – verhindert weißes Aufblitzen.
  win.once('ready-to-show', () => win.show())

  // Im Dev-Modus liefert Vite den Renderer mit Hot Reload aus.
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Hier wird entschieden, welche Speicherung die App nutzt – später z. B. SqliteStorage.
let storage: Storage | undefined

app.whenReady().then(async () => {
  const dataPath = join(app.getPath('userData'), DATA_FILE)
  // Daten aus der Zeit vor der Umbenennung (Ordner "todo") übernehmen
  await adoptLegacyFile(join(app.getPath('appData'), 'todo', DATA_FILE), dataPath)

  storage = new JsonStorage(dataPath)
  registerIpcHandlers(storage)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Vor dem Beenden laufende Schreibvorgänge abwarten, damit nichts verloren geht.
let flushed = false
app.on('will-quit', (event) => {
  if (flushed || !storage) return
  event.preventDefault()
  void storage.flush().finally(() => {
    flushed = true
    app.quit()
  })
})
