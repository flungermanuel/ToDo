import { join } from 'node:path'
import { app, BrowserWindow, nativeTheme } from 'electron'
import { registerIpcHandlers } from './ipc'
import { JsonStorage } from './storage/JsonStorage'
import type { Storage } from './storage/Storage'

// Muss zu --bg in globals.css passen, sonst blitzt beim Start kurz eine andere Farbe auf.
const BACKGROUND = { light: '#f5f5f7', dark: '#1c1c1e' }

function createWindow(): void {
  const win = new BrowserWindow({
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

app.whenReady().then(() => {
  storage = new JsonStorage(join(app.getPath('userData'), 'todo-data.json'))
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
