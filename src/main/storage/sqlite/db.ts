import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { SCHEMA_MIGRATIONS, type SchemaMigration } from './migrations'

// Verbindung zur Datenbank: öffnen, einstellen, Schema aktuell halten, Transaktionen.
// node:sqlite ist in Node/Electron eingebaut und arbeitet synchron – bei unserer
// Datenmenge dauert jeder Zugriff nur Millisekunden (siehe docs/performance.md).

export type Db = DatabaseSync

/** Öffnet (oder erzeugt) die Datenbank und bringt das Schema auf den neuesten Stand. */
export function openDatabase(filePath: string): Db {
  if (filePath !== ':memory:') mkdirSync(dirname(filePath), { recursive: true })
  const db = new DatabaseSync(filePath)
  try {
    // Fremdschlüssel prüft SQLite nur, wenn man es pro Verbindung einschaltet
    db.exec('PRAGMA foreign_keys = ON')
    // WAL: Schreiben blockiert Lesen nicht, und ein Absturz mitten im Schreiben
    // kann die Datei nicht beschädigen
    db.exec('PRAGMA journal_mode = WAL')
    // FULL: Jede abgeschlossene Transaktion liegt sicher auf der Platte – kostet ein paar
    // Millisekunden pro Speichern, dafür geht auch bei Stromausfall nichts verloren
    db.exec('PRAGMA synchronous = FULL')
    migrateSchema(db)
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

/**
 * Führt `fn` in einer Transaktion aus: Entweder klappt alles, oder es bleibt alles
 * beim Alten. IMMEDIATE sperrt die Datenbank sofort fürs Schreiben.
 */
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/** Die Datenbank wurde von einer neueren FlungDo-Version angelegt. */
export class NewerSchemaError extends Error {}

/**
 * Bringt das Schema auf den neuesten Stand. Die aktuelle Version steht in
 * PRAGMA user_version (eine Zahl im Kopf der Datei, 0 = neue, leere Datenbank).
 * Jede fehlende Migration läuft in ihrer eigenen Transaktion – schlägt eine fehl,
 * bleibt die Datenbank auf dem letzten vollständigen Stand.
 */
export function migrateSchema(
  db: Db,
  migrations: readonly SchemaMigration[] = SCHEMA_MIGRATIONS
): void {
  const current = schemaVersion(db)
  const latest = migrations.at(-1)?.version ?? 0
  if (current > latest) {
    throw new NewerSchemaError(
      `Die Datenbank stammt von einer neueren FlungDo-Version (Schema ${current}, unterstützt bis ${latest}).`
    )
  }
  for (const migration of migrations) {
    if (migration.version <= current) continue
    transaction(db, () => {
      db.exec(migration.sql)
      // PRAGMA nimmt keine Parameter – die Version ist eine Zahl aus unserem eigenen Code
      db.exec(`PRAGMA user_version = ${migration.version}`)
    })
  }
}

export function schemaVersion(db: Db): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  return row.user_version
}
