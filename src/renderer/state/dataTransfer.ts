import type { DataSummary, ReadyImportPreview } from '@shared/ipc'
import { flushPendingSave, replaceData } from './appStore'
import { hideToast, showToast } from './toastStore'

// Export und Import aus Sicht der UI. Die Dateiarbeit (Dialoge, Prüfen, Sichern)
// passiert komplett in Main – hier wird nur der Ablauf gesteuert und Rückmeldung gegeben.

export async function exportData(): Promise<void> {
  try {
    // Eine Änderung der letzten 200 ms soll im Export nicht fehlen
    await flushPendingSave()
    const result = await window.api.data.exportToFile()
    if (result.status === 'saved') showToast(`Exportiert als „${result.fileName}“`)
  } catch (error) {
    console.error('Export fehlgeschlagen:', error)
    showToast('Export fehlgeschlagen', { tone: 'danger' })
  }
}

/** Schritt 1: Datei wählen. Gibt die Vorschau zurück, wenn nachgefragt werden soll. */
export async function pickImportFile(): Promise<ReadyImportPreview | null> {
  try {
    const preview = await window.api.data.pickImportFile()
    if (preview.status === 'invalid') {
      showToast(preview.message, { tone: 'danger' })
      return null
    }
    return preview.status === 'ready' ? preview : null
  } catch (error) {
    console.error('Import fehlgeschlagen:', error)
    showToast('Import fehlgeschlagen', { tone: 'danger' })
    return null
  }
}

/** Schritt 2: Nach der Bestätigung übernehmen. */
export async function confirmImport(): Promise<void> {
  try {
    // Wartende Änderung erst speichern – sonst würde sie gleich nach dem Import
    // die importierten Daten wieder überschreiben. Sie landet so in der Sicherung.
    await flushPendingSave()
    const data = await window.api.data.confirmImport()
    replaceData(data)
    // Ein offenes "Rückgängig" bezieht sich auf die alten Daten
    hideToast()
    showToast('Daten importiert – der vorherige Stand wurde gesichert')
  } catch (error) {
    console.error('Import fehlgeschlagen:', error)
    showToast('Import fehlgeschlagen, deine Daten sind unverändert', { tone: 'danger' })
  }
}

/** "12 Todos, 3 Deadlines und 1 Prüfung in 2 Kategorien" */
export function describeSummary(s: DataSummary): string {
  const parts = [
    count(s.todos, 'Todo', 'Todos'),
    count(s.deadlines, 'Deadline', 'Deadlines'),
    count(s.exams, 'Prüfung', 'Prüfungen')
  ]
  const list = `${parts.slice(0, -1).join(', ')} und ${parts.at(-1)}`
  return `${list} in ${count(s.categories, 'Kategorie', 'Kategorien')}`
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
