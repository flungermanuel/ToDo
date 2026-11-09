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
// FLUNGDO_DATA_DIR lenkt die Daten für Tests und Messungen in einen anderen Ordner,
// damit die echten Daten nie angefasst werden.
app.setName(APP_NAME)
app.setPath('userData', process.env['FLUNGDO_DATA_DIR'] || join(app.getPath('appData'), APP_NAME))
// Muss zur appId in electron-builder.yml passen: Darüber ordnet Windows das Fenster
// der installierten Verknüpfung zu (richtiges Symbol in der Taskleiste).
app.setAppUserModelId('de.flunger.flungdo')

// Nur eine Instanz: Zwei Fenster würden dieselbe JSON-Datei abwechselnd überschreiben.
// Startet man FlungDo ein zweites Mal, beendet sich die neue Instanz sofort und
// die laufende holt ihr Fenster nach vorne.
const isPrimaryInstance = app.requestSingleInstanceLock()
if (!isPrimaryInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })
}

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
  // Die zweite Instanz beendet sich gerade – sie darf die Datei nicht anfassen
  if (!isPrimaryInstance) return
  const dataPath = join(app.getPath('userData'), DATA_FILE)
  // Daten aus der Zeit vor der Umbenennung (Ordner "todo") übernehmen –
  // nicht in einem Test-Ordner, sonst landen echte Daten in Testläufen
  if (!process.env['FLUNGDO_DATA_DIR']) {
    await adoptLegacyFile(join(app.getPath('appData'), 'todo', DATA_FILE), dataPath)
  }

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
