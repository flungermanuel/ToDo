import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { backupName, createBackup, listBackups, MAX_BACKUPS } from '../backup'

describe('createBackup', () => {
  let dir: string
  let file: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'flungdo-backup-'))
    file = join(dir, 'todo-data.json')
    await writeFile(file, '{"version":3}', 'utf-8')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('kopiert die Datei unter einem Namen mit Grund und Zeitstempel', async () => {
    const target = await createBackup(file, 'v3', new Date(2026, 10, 9, 12, 34, 56, 7))
    expect(target).toBe(join(dir, 'todo-data.backup-v3-20261109T123456007.json'))
    expect(await readFile(target, 'utf-8')).toBe('{"version":3}')
  })

  it(`behält nur die neuesten ${MAX_BACKUPS} – nach Zeit, nicht nach Grund sortiert`, async () => {
    const tags = ['v1', 'import', 'v3', 'v2', 'import', 'v1', 'v3']
    for (const [i, tag] of tags.entries()) {
      await createBackup(file, tag, new Date(2026, 0, 1 + i))
    }
    const backups = await listBackups(file)
    expect(backups).toEqual(
      tags.slice(-MAX_BACKUPS).map((tag, i) => backupName(file, tag, new Date(2026, 0, 3 + i)))
    )
    // Die Datei selbst und fremde Dateien bleiben unangetastet
    expect(await readdir(dir)).toContain('todo-data.json')
  })

  it('ignoriert Dateien, die nur ähnlich heißen', async () => {
    await writeFile(join(dir, 'todo-data.backup-notiz.txt'), '', 'utf-8')
    await writeFile(join(dir, 'todo-data.json.corrupt-123'), '', 'utf-8')
    expect(await listBackups(file)).toEqual([])
  })
})
