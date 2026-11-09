import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  migrateSchema,
  NewerSchemaError,
  openDatabase,
  schemaVersion,
  transaction,
  type Db
} from '../db'
import { SCHEMA_MIGRATIONS } from '../migrations'

describe('openDatabase', () => {
  let dir: string
  let db: Db | undefined

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'flungdo-db-'))
  })
  afterEach(async () => {
    if (db?.isOpen) db.close()
    await rm(dir, { recursive: true, force: true })
  })

  it('legt Datei, Ordner und Schema an und setzt die Einstellungen', () => {
    db = openDatabase(join(dir, 'sub', 'flungdo.db'))
    expect(schemaVersion(db)).toBe(SCHEMA_MIGRATIONS.at(-1)!.version)
    const tables = db
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name")
      .all()
      .map((r) => r['name'])
    expect(tables).toEqual(['categories', 'deadlines', 'exams', 'subtasks', 'todos'])
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 })
    expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' })
  })

  it('erneutes Öffnen führt keine Migration doppelt aus', () => {
    const path = join(dir, 'flungdo.db')
    openDatabase(path).close()
    db = openDatabase(path)
    expect(schemaVersion(db)).toBe(1)
  })

  it('weigert sich, eine Datenbank einer neueren App-Version zu öffnen', () => {
    const path = join(dir, 'flungdo.db')
    const newer = openDatabase(path)
    newer.exec('PRAGMA user_version = 99')
    newer.close()
    expect(() => openDatabase(path)).toThrow(NewerSchemaError)
  })
})

describe('migrateSchema', () => {
  it('führt fehlende Migrationen der Reihe nach aus', () => {
    const db = openDatabase(':memory:')
    migrateSchema(db, [
      ...SCHEMA_MIGRATIONS,
      { version: 2, name: 'notiz', sql: 'ALTER TABLE todos ADD COLUMN notiz TEXT' }
    ])
    expect(schemaVersion(db)).toBe(2)
    const columns = db
      .prepare('PRAGMA table_info(todos)')
      .all()
      .map((c) => c['name'])
    expect(columns).toContain('notiz')
    db.close()
  })

  it('eine fehlerhafte Migration ändert nichts – auch nicht die Version', () => {
    const db = openDatabase(':memory:')
    expect(() =>
      migrateSchema(db, [
        ...SCHEMA_MIGRATIONS,
        { version: 2, name: 'kaputt', sql: 'CREATE TABLE neu (x); SELECT * FROM gibt_es_nicht' }
      ])
    ).toThrow()
    expect(schemaVersion(db)).toBe(1)
    const neu = db.prepare("SELECT name FROM sqlite_schema WHERE name = 'neu'").get()
    expect(neu).toBeUndefined()
    db.close()
  })
})

describe('transaction', () => {
  it('nimmt bei einem Fehler alles zurück', () => {
    const db = openDatabase(':memory:')
    const insert = db.prepare(
      "INSERT INTO categories (id, name, farbe, position) VALUES (?, ?, 'blue', 0)"
    )
    expect(() =>
      transaction(db, () => {
        insert.run('c1', 'Uni')
        insert.run('c1', 'Doppelt') // PRIMARY KEY verletzt
      })
    ).toThrow()
    expect(db.prepare('SELECT count(*) AS n FROM categories').get()).toEqual({ n: 0 })
    db.close()
  })

  it('Fremdschlüssel und Prüfungen greifen', () => {
    const db = openDatabase(':memory:')
    const badTodo = () =>
      db
        .prepare(
          `INSERT INTO todos (id, titel, erledigt, erstellt_am, prioritaet, category_id, position)
           VALUES ('t1', 'X', 0, '', 3, 'gibt-es-nicht', 0)`
        )
        .run()
    expect(badTodo).toThrow(/FOREIGN KEY/)
    const badColor = () =>
      db.prepare("INSERT INTO categories VALUES ('c1', 'Uni', 'pink', 0)").run()
    expect(badColor).toThrow(/CHECK/)
    db.close()
  })
})
