import { join } from 'node:path'
import { adoptJsonIntoDatabase } from './adoptJson'
import { JsonStorage } from './JsonStorage'
import type { Storage } from './Storage'
import { SqliteStorage } from './sqlite/SqliteStorage'
import { UnavailableStorage } from './UnavailableStorage'

export const JSON_FILE = 'todo-data.json'
export const DB_FILE = 'flungdo.db'

/**
 * Entscheidet beim Start, welche Speicherung die App nutzt:
 *
 * - Normalfall: SQLite (flungdo.db). Gibt es noch eine todo-data.json aus FlungDo 1.x,
 *   wird sie vorher übernommen.
 * - Übernahme fehlgeschlagen: weiter mit der JSON-Datei, nichts geht verloren. Beim
 *   nächsten Start wird es erneut versucht.
 * - Datenbank lässt sich nicht öffnen: kein Laden und kein Speichern, statt sie mit
 *   leeren Daten zu überschreiben.
 *
 * `onNotice` gibt Meldungen an die UI weiter.
 */
export async function createStorage(
  dataDir: string,
  onNotice: (message: string) => void
): Promise<Storage> {
  const jsonPath = join(dataDir, JSON_FILE)
  const dbPath = join(dataDir, DB_FILE)

  const adoption = await adoptJsonIntoDatabase(jsonPath, dbPath)
  if (adoption.status === 'failed') {
    console.error('Übernahme in die Datenbank fehlgeschlagen:', adoption.error)
    onNotice(
      'Deine Daten konnten nicht in die neue Datenbank übernommen werden. FlungDo nutzt ' +
        `vorerst weiter die bisherige Datei, es ist nichts verloren gegangen. (${describe(adoption.error)})`
    )
    return new JsonStorage(jsonPath, { onNotice })
  }
  if (adoption.status === 'adopted') {
    console.info('Daten in die Datenbank übernommen:', adoption.counts)
  }

  try {
    return new SqliteStorage(dbPath)
  } catch (error) {
    console.error('Datenbank konnte nicht geöffnet werden:', error)
    onNotice(`Die Datenbank konnte nicht geöffnet werden: ${describe(error)}`)
    return new UnavailableStorage(error)
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
