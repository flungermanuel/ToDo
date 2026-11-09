import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SqliteStorage } from '../SqliteStorage'
import { richSample } from '../../__tests__/sampleData'

// Was nur SQLite betrifft. Das allgemeine Verhalten prüft der Storage-Vertrag.
describe('SqliteStorage', () => {
  let dir: string
  let storage: SqliteStorage

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'flungdo-sqlite-'))
    storage = new SqliteStorage(join(dir, 'flungdo.db'))
  })

  afterEach(async () => {
    await storage.close()
    await rm(dir, { recursive: true, force: true })
  })

  it('ein fehlgeschlagener Save lässt den alten Stand vollständig stehen', async () => {
    await storage.save(richSample())
    const broken = richSample()
    // Todo zeigt auf eine Kategorie, die es nicht gibt → Fremdschlüssel verletzt.
    // (In der App verhindert das migrate() vorher, hier geht es um die Transaktion.)
    broken.todos[0]!.categoryId = 'gibt-es-nicht'
    broken.exams = []
    await expect(storage.save(broken)).rejects.toThrow(/FOREIGN KEY/)
    expect(await storage.load()).toStrictEqual(richSample())
  })

  it('die Sicherung ist eine vollständige, eigenständig lesbare Datenbank', async () => {
    await storage.save(richSample())
    const path = await storage.backup('import')
    expect(path).toMatch(/flungdo\.backup-import-\d{8}T\d{9}\.db$/)

    const copy = new SqliteStorage(path!)
    try {
      expect(await copy.load()).toStrictEqual(richSample())
    } finally {
      await copy.close()
    }
  })

  it('nach close() sind weitere Zugriffe ein klarer Fehler, erneutes close() schadet nicht', async () => {
    await storage.close()
    await expect(storage.load()).rejects.toThrow('geschlossen')
    await expect(storage.close()).resolves.toBeUndefined()
  })
})
