import { copyFile, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyAppData } from '@shared/types'
import { createStorage, DB_FILE, JSON_FILE } from '../createStorage'
import { JsonStorage } from '../JsonStorage'
import { migrate } from '../migrations'
import type { Storage } from '../Storage'
import { openDatabase } from '../sqlite/db'
import { SqliteStorage } from '../sqlite/SqliteStorage'

describe('createStorage', () => {
  let dir: string
  let storage: Storage | undefined
  const notices: string[] = []
  const onNotice = (message: string) => notices.push(message)

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'flungdo-create-'))
    notices.length = 0
  })

  afterEach(async () => {
    await storage?.close()
    await rm(dir, { recursive: true, force: true })
  })

  it('frische Installation: leere Datenbank', async () => {
    storage = await createStorage(dir, onNotice)
    expect(storage).toBeInstanceOf(SqliteStorage)
    expect(await storage.load()).toStrictEqual(emptyAppData())
    expect(notices).toEqual([])
  })

  it('Update von 1.x: übernimmt die JSON-Datei und nutzt danach die Datenbank', async () => {
    const fixture = join(import.meta.dirname, 'fixtures', 'v4.json')
    await copyFile(fixture, join(dir, JSON_FILE))
    storage = await createStorage(dir, onNotice)
    expect(storage).toBeInstanceOf(SqliteStorage)
    expect(await storage.load()).toStrictEqual(
      migrate(JSON.parse(await readFile(fixture, 'utf-8')))
    )
    expect(notices).toEqual([])
  })

  it('Übernahme fehlgeschlagen: weiter mit JSON und Hinweis', async () => {
    await writeFile(join(dir, JSON_FILE), '{ kaputt', 'utf-8')
    storage = await createStorage(dir, onNotice)
    expect(storage).toBeInstanceOf(JsonStorage)
    expect(notices[0]).toMatch(/nicht in die neue Datenbank übernommen/)
    expect(await readdir(dir)).not.toContain(DB_FILE)
  })

  it('Datenbank nicht lesbar: weder Laden noch Speichern, dafür ein Hinweis', async () => {
    const db = openDatabase(join(dir, DB_FILE))
    db.exec('PRAGMA user_version = 99')
    db.close()
    storage = await createStorage(dir, onNotice)
    await expect(storage.load()).rejects.toThrow('nicht verfügbar')
    await expect(storage.save(emptyAppData())).rejects.toThrow('nicht verfügbar')
    expect(notices[0]).toMatch(/neueren FlungDo-Version/)
  })
})
