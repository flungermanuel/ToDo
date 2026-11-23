import { globalShortcut, type BrowserWindow } from 'electron'
import { IpcChannels } from '@shared/ipc'

// Globaler Hotkey: funktioniert auch, wenn FlungDo im Hintergrund oder minimiert ist.
export const QUICK_OPEN_ACCELERATOR = 'Control+Space'

/**
 * Holt das Fenster nach vorne und sagt dem Renderer, dass die Schnellleiste aufgehen soll.
 * Gibt false zurück, wenn Windows die Tastenkombination nicht freigibt (z. B. weil ein
 * anderes Programm sie belegt) – der Aufrufer zeigt dann einen Hinweis.
 */
export function registerQuickOpenHotkey(getWindow: () => BrowserWindow | undefined): boolean {
  return globalShortcut.register(QUICK_OPEN_ACCELERATOR, () => {
    const win = getWindow()
    // Solange ein Dialog (Export/Import) offen ist, ist das Hauptfenster gesperrt:
    // dann nichts tun, sonst läge die Schnellleiste hinter dem Dialog
    if (!win || !win.isEnabled()) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    win.webContents.send(IpcChannels.appQuickCapture)
  })
}

export function unregisterQuickOpenHotkey(): void {
  globalShortcut.unregisterAll()
}
