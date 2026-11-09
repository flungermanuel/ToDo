import { dirname, join } from 'node:path'
import { emptyAppData, type AppData } from '@shared/types'
import { backupName, pruneBackups } from '../backup'
import type { Storage } from '../Storage'
import { openDatabase, transaction, type Db } from './db'
import * as categories from './repositories/categories'
import * as deadlines from './repositories/deadlines'
import * as exams from './repositories/exams'
import * as subtasks from './repositories/subtasks'
import * as todos from './repositories/todos'

/**
 * Speichert alles in einer SQLite-Datenbank (%APPDATA%/FlungDo/flungdo.db).
 *
 * Nach außen dieselbe Schnittstelle wie JsonStorage: Der ganze Datenstand wird
 * geladen und gespeichert (Variante A, siehe docs/decisions.md). Gespeichert wird in
 * EINER Transaktion – alles löschen, alles neu einfügen. Klappt etwas nicht, bleibt
 * der alte Stand vollständig erhalten.
 *
 * node:sqlite arbeitet synchron. Die Methoden sind trotzdem async, weil das Interface
 * es so vorgibt; eine Warteschlange wie bei JSON ist nicht nötig, weil jeder Save
 * fertig ist, bevor der nächste beginnt.
 */
export class SqliteStorage implements Storage {
  private db: Db | null

  /** Öffnet die Datenbank sofort – Fehler (z. B. neueres Schema) fallen so beim Start auf. */
  constructor(private readonly filePath: string) {
    this.db = openDatabase(filePath)
  }

  async load(): Promise<AppData> {
    const db = this.connection()
    // Es gibt immer mindestens eine Kategorie. Keine Kategorie = noch nie gespeichert.
    if (categories.count(db) === 0) return emptyAppData()
    return {
      version: 4,
      categories: categories.selectAll(db),
      todos: todos.selectAll(db, subtasks.selectAllByTodo(db)),
      deadlines: deadlines.selectAll(db),
      exams: exams.selectAll(db)
    }
  }

  async save(data: AppData): Promise<void> {
    const db = this.connection()
    transaction(db, () => {
      // Reihenfolge wegen der Fremdschlüssel: erst was auf andere zeigt, dann das Ziel
      todos.deleteAll(db) // Unteraufgaben gehen per CASCADE mit
      deadlines.deleteAll(db)
      exams.deleteAll(db)
      categories.deleteAll(db)

      categories.insertAll(db, data.categories)
      deadlines.insertAll(db, data.deadlines)
      todos.insertAll(db, data.todos)
      subtasks.insertAllOf(db, data.todos)
      exams.insertAll(db, data.exams)
    })
  }

  async flush(): Promise<void> {
    // Nichts zu tun: Jeder Save ist abgeschlossen, wenn er zurückkehrt.
  }

  /**
   * Sicherung als eigene Datenbankdatei neben dem Original.
   * VACUUM INTO statt Datei kopieren: Im WAL-Modus stehen die neuesten Änderungen
   * evtl. noch in flungdo.db-wal – eine einfache Kopie der .db wäre unvollständig.
   */
  async backup(tag: string): Promise<string | null> {
    const db = this.connection()
    if (categories.count(db) === 0) return null
    const target = join(dirname(this.filePath), backupName(this.filePath, tag, new Date()))
    db.prepare('VACUUM INTO ?').run(target)
    await pruneBackups(this.filePath)
    return target
  }

  async close(): Promise<void> {
    this.db?.close()
    this.db = null
  }

  private connection(): Db {
    if (!this.db) throw new Error('Datenbank ist bereits geschlossen')
    return this.db
  }
}
