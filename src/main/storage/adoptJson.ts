import { readFile, rm, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import type { DataSummary } from '@shared/ipc'
import type { AppData } from '@shared/types'
import { renameWithRetry } from './atomicWrite'
import { createBackup } from './backup'
import { countData } from './counts'
import { migrate } from './migrations'
import type { Storage } from './Storage'
import { SqliteStorage } from './sqlite/SqliteStorage'

/** Name, unter dem die JSON-Datei nach erfolgreicher Übernahme liegen bleibt. */
export const MIGRATED_JSON = 'todo-data.migrated.json'

export type AdoptResult =
  /** Nichts zu tun: Datenbank gibt es schon, oder es gibt keine JSON-Datei */
  | { status: 'skipped' }
  | { status: 'adopted'; counts: DataSummary; backupPath: string }
  /** Nichts wurde verändert, die JSON-Datei bleibt aktiv */
  | { status: 'failed'; error: unknown }

/**
 * Übernimmt beim ersten Start von FlungDo 2.0 die Daten aus todo-data.json in die
 * Datenbank. Ablauf – jeder Schritt erst, wenn der vorige geklappt hat:
 *
 * 1. JSON sichern (todo-data.backup-vor-sqlite-<zeit>.json)
 * 2. JSON lesen und auf die aktuelle Version bringen (ohne die Datei zu ändern)
 * 3. In eine TEMPORÄRE Datenbank schreiben (flungdo.db.tmp)
 * 4. Neu öffnen, alles zurücklesen und mit dem Original vergleichen (Inhalt und Anzahl)
 * 5. Erst jetzt: flungdo.db.tmp → flungdo.db und todo-data.json → todo-data.migrated.json
 *
 * Scheitert 1–4, wird die temporäre Datenbank gelöscht und die JSON-Datei bleibt
 * unverändert aktiv. Durch das Umbenennen in Schritt 5 gibt es nie eine halb
 * befüllte flungdo.db.
 */
export async function adoptJsonIntoDatabase(
  jsonPath: string,
  dbPath: string,
  // Austauschbar nur für Tests (z. B. um einen fehlerhaften Vergleich zu provozieren)
  openStorage: (path: string) => Storage = (path) => new SqliteStorage(path)
): Promise<AdoptResult> {
  if (await exists(dbPath)) return { status: 'skipped' }
  if (!(await exists(jsonPath))) return { status: 'skipped' }

  const tmpPath = `${dbPath}.tmp`
  let counts: DataSummary
  let backupPath: string
  try {
    backupPath = await createBackup(jsonPath, 'vor-sqlite')
    const data = migrate(JSON.parse(await readFile(jsonPath, 'utf-8')))

    await removeDatabaseFiles(tmpPath) // Reste eines abgebrochenen Versuchs
    const writer = openStorage(tmpPath)
    try {
      await writer.save(data)
    } finally {
      await writer.close()
    }

    const reader = openStorage(tmpPath)
    let stored: AppData
    try {
      stored = await reader.load()
    } finally {
      await reader.close()
    }

    counts = countData(data)
    const storedCounts = countData(stored)
    if (!isDeepStrictEqual(storedCounts, counts)) {
      throw new Error(
        `Anzahl stimmt nicht: JSON ${JSON.stringify(counts)}, Datenbank ${JSON.stringify(storedCounts)}`
      )
    }
    if (!isDeepStrictEqual(stored, data)) {
      throw new Error('Inhalt der Datenbank weicht von der JSON-Datei ab')
    }

    await renameWithRetry(tmpPath, dbPath)
  } catch (error) {
    await removeDatabaseFiles(tmpPath).catch(() => {})
    return { status: 'failed', error }
  }

  // Die Datenbank ist vollständig und aktiv. Klappt das Umbenennen der JSON-Datei
  // nicht, ist das harmlos: Beim nächsten Start gibt es flungdo.db, die JSON wird ignoriert.
  try {
    await renameWithRetry(jsonPath, join(dirname(jsonPath), MIGRATED_JSON))
  } catch (error) {
    console.warn('todo-data.json konnte nicht umbenannt werden:', error)
  }
  return { status: 'adopted', counts, backupPath }
}

/** Eine SQLite-Datenbank kann aus bis zu drei Dateien bestehen. */
async function removeDatabaseFiles(path: string): Promise<void> {
  await Promise.all(['', '-wal', '-shm'].map((suffix) => rm(path + suffix, { force: true })))
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
