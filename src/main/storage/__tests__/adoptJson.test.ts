import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AppData } from '@shared/types'
import { adoptJsonIntoDatabase, MIGRATED_JSON } from '../adoptJson'
import { migrate } from '../migrations'
import type { Storage } from '../Storage'
import { SqliteStorage } from '../sqlite/SqliteStorage'

const FIXTURES = join(import.meta.dirname, 'fixtures')

describe('adoptJsonIntoDatabase', () => {
  let dir: string
  let jsonPath: string
  let dbPath: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'flungdo-adopt-'))
    jsonPath = join(dir, 'todo-data.json')
    dbPath = join(dir, 'flungdo.db')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function loadDb(): Promise<AppData> {
    const storage = new SqliteStorage(dbPath)
    try {
      return await storage.load()
    } finally {
      await storage.close()
    }
  }

  describe.each(['v1', 'v2', 'v3', 'v4'])('Altdaten %s', (version) => {
    it('werden vollständig übernommen, gesichert und die JSON umbenannt', async () => {
      const fixture = join(FIXTURES, `${version}.json`)
      await copyFile(fixture, jsonPath)
      const original = await readFile(fixture, 'utf-8')
      const expected = migrate(JSON.parse(original))

      const result = await adoptJsonIntoDatabase(jsonPath, dbPath)

      expect(result.status).toBe('adopted')
      if (result.status !== 'adopted') return
      expect(await loadDb()).toStrictEqual(expected)
      expect(result.counts).toEqual({
        categories: expected.categories.length,
        todos: expected.todos.length,
        subtasks: expected.todos.reduce((n, t) => n + t.unteraufgaben.length, 0),
        deadlines: expected.deadlines.length,
        exams: expected.exams.length
      })
      // Sicherung = unverändertes Original; die JSON liegt umbenannt daneben
      expect(await readFile(result.backupPath, 'utf-8')).toBe(original)
      expect(await readFile(join(dir, MIGRATED_JSON), 'utf-8')).toBe(original)
      const files = await readdir(dir)
      expect(files).not.toContain('todo-data.json')
      expect(files.some((f) => f.startsWith('flungdo.db.tmp'))).toBe(false)
    })
  })

  it('tut nichts, wenn es schon eine Datenbank gibt', async () => {
    await copyFile(join(FIXTURES, 'v4.json'), jsonPath)
    await new SqliteStorage(dbPath).close()
    expect(await adoptJsonIntoDatabase(jsonPath, dbPath)).toEqual({ status: 'skipped' })
    expect(await readdir(dir)).toContain('todo-data.json')
  })

  it('tut nichts bei einer frischen Installation ohne JSON', async () => {
    expect(await adoptJsonIntoDatabase(jsonPath, dbPath)).toEqual({ status: 'skipped' })
    expect(await readdir(dir)).toEqual([])
  })

  describe('wenn etwas schiefgeht, bleibt die JSON unverändert aktiv', () => {
    async function expectUntouched(original: string) {
      expect(await readFile(jsonPath, 'utf-8')).toBe(original)
      const files = await readdir(dir)
      expect(files.filter((f) => f.startsWith('flungdo.db'))).toEqual([])
      expect(files).not.toContain(MIGRATED_JSON)
    }

    it('unlesbare JSON-Datei', async () => {
      await writeFile(jsonPath, '{ kaputt', 'utf-8')
      const result = await adoptJsonIntoDatabase(jsonPath, dbPath)
      expect(result.status).toBe('failed')
      await expectUntouched('{ kaputt')
    })

    it('Datenbank lässt sich nicht anlegen', async () => {
      await copyFile(join(FIXTURES, 'v4.json'), jsonPath)
      const original = await readFile(jsonPath, 'utf-8')
      // Ein Ordner, wo die temporäre Datenbank hin soll → SQLite kann sie nicht öffnen
      await mkdir(`${dbPath}.tmp`)
      const result = await adoptJsonIntoDatabase(jsonPath, dbPath)
      expect(result.status).toBe('failed')
      expect(await readFile(jsonPath, 'utf-8')).toBe(original)
      expect(await readdir(dir)).not.toContain('flungdo.db')
    })

    it('zurückgelesene Daten weichen ab', async () => {
      await copyFile(join(FIXTURES, 'v3.json'), jsonPath)
      const original = await readFile(jsonPath, 'utf-8')
      // Storage, die beim Zurücklesen ein Todo "verliert"
      const lossy = (path: string): Storage => {
        const real = new SqliteStorage(path)
        return Object.assign(Object.create(real) as Storage, {
          load: async () => {
            const data = await real.load()
            return { ...data, todos: data.todos.slice(1) }
          },
          save: (d: AppData) => real.save(d),
          close: () => real.close()
        })
      }
      const result = await adoptJsonIntoDatabase(jsonPath, dbPath, lossy)
      expect(result.status).toBe('failed')
      if (result.status === 'failed') expect(String(result.error)).toMatch(/Anzahl stimmt nicht/)
      await expectUntouched(original)
    })
  })
})
