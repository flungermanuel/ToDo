import { readFile } from 'node:fs/promises'
import type { DataSummary } from '@shared/ipc'
import type { AppData } from '@shared/types'
import { writeFileAtomic } from './storage/atomicWrite'
import { migrate, UnreadableDataError } from './storage/migrations'
import type { Storage } from './storage/Storage'

// Export und Import der Daten als JSON-Datei. Hier steckt nur die
// Dateiarbeit – die Dialoge öffnet ipc.ts, damit sich das hier ohne Electron testen lässt.

/**
 * Schreibt den gespeicherten Stand in eine Datei. Das Format ist dasselbe wie
 * todo-data.json (mit Versionsnummer), damit ein Import es wieder einlesen kann –
 * auch dann, wenn die App intern längst SQLite nutzt.
 */
export async function exportData(storage: Storage, filePath: string): Promise<void> {
  // Erst laufende Schreibvorgänge abwarten, sonst fehlt die letzte Änderung
  await storage.flush()
  const data = await storage.load()
  await writeFileAtomic(filePath, JSON.stringify(data, null, 2))
}

/** Eine Import-Datei ist unlesbar. Die Meldung ist für die UI gedacht. */
export class ImportError extends Error {}

/**
 * Liest eine Import-Datei und macht daraus gültige AppData – ältere Versionen werden
 * dabei migriert (dieselbe Funktion wie beim Laden). Überschrieben wird noch nichts.
 */
export async function readImportFile(filePath: string): Promise<AppData> {
  let text: string
  try {
    text = await readFile(filePath, 'utf-8')
  } catch {
    throw new ImportError('Die Datei konnte nicht gelesen werden.')
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ImportError('Die Datei ist keine gültige JSON-Datei.')
  }
  try {
    return migrate(raw)
  } catch (error) {
    const detail = error instanceof UnreadableDataError ? ` (${error.message})` : ''
    throw new ImportError(`Die Datei enthält keine FlungDo-Daten${detail}.`)
  }
}

/** Ersetzt den gespeicherten Stand – vorher wird er gesichert. */
export async function importData(storage: Storage, data: AppData): Promise<void> {
  await storage.backup('import')
  await storage.save(data)
}

export function summarize(data: AppData): DataSummary {
  return {
    categories: data.categories.length,
    todos: data.todos.length,
    subtasks: data.todos.reduce((sum, t) => sum + t.unteraufgaben.length, 0),
    deadlines: data.deadlines.length,
    exams: data.exams.length
  }
}

/** Vorschlag für den Dateinamen, z. B. "FlungDo-Export-2026-11-09.json" */
export function exportFileName(today: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
  return `FlungDo-Export-${date}.json`
}
