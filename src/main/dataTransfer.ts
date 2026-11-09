import { writeFileAtomic } from './storage/atomicWrite'
import type { Storage } from './storage/Storage'

// Export (und später Import) der Daten als JSON-Datei. Hier steckt nur die
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

/** Vorschlag für den Dateinamen, z. B. "FlungDo-Export-2026-11-09.json" */
export function exportFileName(today: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
  return `FlungDo-Export-${date}.json`
}
