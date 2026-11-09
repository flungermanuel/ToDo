import { dirname, join } from 'node:path'
import { emptyAppData, type AppData } from '@shared/types'
import { backupName, pruneBackups } from '../backup'
import type { Storage } from '../Storage'
import { openDatabase, transaction, type Db } from './db'
import { diffRows, type Row, type TableState } from './diff'
import * as categories from './repositories/categories'
import * as deadlines from './repositories/deadlines'
import * as exams from './repositories/exams'
import * as subtasks from './repositories/subtasks'
import * as todos from './repositories/todos'

/** Was zuletzt gespeichert wurde, pro Tabelle (siehe diff.ts) */
interface SavedState {
  categories: TableState
  deadlines: TableState
  todos: TableState
  subtasks: TableState
  exams: TableState
}

const EMPTY_STATE: SavedState = {
  categories: new Map(),
  deadlines: new Map(),
  todos: new Map(),
  subtasks: new Map(),
  exams: new Map()
}

/**
 * Speichert alles in einer SQLite-Datenbank (%APPDATA%/FlungDo/flungdo.db).
 *
 * Nach außen dieselbe Schnittstelle wie JsonStorage: Der ganze Datenstand wird
 * geladen und gespeichert (siehe docs/decisions.md). Intern wird aber nur geschrieben,
 * was sich seit dem letzten Laden/Speichern geändert hat – beim Abhaken eines Todos
 * also eine Zeile statt tausender. Das hat die Messung in docs/performance.md gezeigt:
 * Alles neu zu schreiben dauerte bei 10.000 Todos über 200 ms pro Speichern.
 *
 * Jeder Speichervorgang ist EINE Transaktion. Klappt etwas nicht, bleibt der alte
 * Stand vollständig erhalten.
 *
 * node:sqlite arbeitet synchron. Die Methoden sind trotzdem async, weil das Interface
 * es so vorgibt; eine Warteschlange wie bei JSON ist nicht nötig, weil jeder Save
 * fertig ist, bevor der nächste beginnt.
 */
export class SqliteStorage implements Storage {
  private db: Db | null
  /**
   * Stand der Datenbank nach dem letzten load()/save(). null = unbekannt (z. B. direkt
   * nach dem Öffnen ohne load) – dann wird beim nächsten Speichern alles neu geschrieben.
   */
  private saved: SavedState | null = null

  /** Öffnet die Datenbank sofort – Fehler (z. B. neueres Schema) fallen so beim Start auf. */
  constructor(private readonly filePath: string) {
    this.db = openDatabase(filePath)
  }

  async load(): Promise<AppData> {
    const db = this.connection()
    // Es gibt immer mindestens eine Kategorie. Keine Kategorie = noch nie gespeichert.
    if (categories.count(db) === 0) {
      this.saved = EMPTY_STATE
      return emptyAppData()
    }
    const data: AppData = {
      version: 4,
      categories: categories.selectAll(db),
      todos: todos.selectAll(db, subtasks.selectAllByTodo(db)),
      deadlines: deadlines.selectAll(db),
      exams: exams.selectAll(db)
    }
    this.saved = stateOf(rowsOf(data))
    return data
  }

  async save(data: AppData): Promise<void> {
    const db = this.connection()
    const rows = rowsOf(data)
    const previous = this.saved
    transaction(db, () => {
      if (previous) writeChanges(db, previous, rows)
      else replaceAll(db, rows)
    })
    // Erst nach erfolgreichem COMMIT merken – sonst stimmte der Vergleich beim nächsten Mal nicht
    this.saved = stateOf(rows)
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

interface TableRows {
  categories: Row[]
  deadlines: Row[]
  todos: Row[]
  subtasks: Row[]
  exams: Row[]
}

function rowsOf(data: AppData): TableRows {
  return {
    categories: categories.rows(data.categories),
    deadlines: deadlines.rows(data.deadlines),
    todos: todos.rows(data.todos),
    subtasks: subtasks.rows(data.todos),
    exams: exams.rows(data.exams)
  }
}

function stateOf(rows: TableRows): SavedState {
  return {
    categories: diffRows(new Map(), rows.categories).next,
    deadlines: diffRows(new Map(), rows.deadlines).next,
    todos: diffRows(new Map(), rows.todos).next,
    subtasks: diffRows(new Map(), rows.subtasks).next,
    exams: diffRows(new Map(), rows.exams).next
  }
}

/**
 * Schreibt nur die Unterschiede. Die Reihenfolge folgt den Fremdschlüsseln:
 * Erst anlegen, worauf andere zeigen (Kategorien, Deadlines), dann Todos und
 * Unteraufgaben; gelöscht wird umgekehrt, Kategorien zuletzt – bis dahin sind
 * ihre Todos verschoben oder gelöscht.
 */
function writeChanges(db: Db, previous: SavedState, rows: TableRows): void {
  const c = diffRows(previous.categories, rows.categories)
  const d = diffRows(previous.deadlines, rows.deadlines)
  const t = diffRows(previous.todos, rows.todos)
  const s = diffRows(previous.subtasks, rows.subtasks)
  const e = diffRows(previous.exams, rows.exams)

  categories.upsert(db, c.changed)
  deadlines.upsert(db, d.changed)
  todos.upsert(db, t.changed)
  subtasks.upsert(db, s.changed)
  exams.upsert(db, e.changed)

  subtasks.deleteIds(db, s.removed)
  todos.deleteIds(db, t.removed)
  deadlines.deleteIds(db, d.removed)
  exams.deleteIds(db, e.removed)
  categories.deleteIds(db, c.removed)
}

/** Stand der Datenbank unbekannt: alles löschen und neu schreiben. */
function replaceAll(db: Db, rows: TableRows): void {
  todos.deleteAll(db) // Unteraufgaben gehen per CASCADE mit
  deadlines.deleteAll(db)
  exams.deleteAll(db)
  categories.deleteAll(db)

  categories.upsert(db, rows.categories)
  deadlines.upsert(db, rows.deadlines)
  todos.upsert(db, rows.todos)
  subtasks.upsert(db, rows.subtasks)
  exams.upsert(db, rows.exams)
}
