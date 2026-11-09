import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import { exportData, exportFileName } from '../dataTransfer'
import { JsonStorage } from '../storage/JsonStorage'
import { migrate } from '../storage/migrations'

describe('exportData', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'flungdo-export-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('schreibt den zuletzt gespeicherten Stand – auch wenn der Save noch läuft', async () => {
    const storage = new JsonStorage(join(dir, 'todo-data.json'))
    const data: AppData = {
      ...emptyAppData(),
      exams: [{ id: 'e1', titel: 'Ä 🎓', datum: '2027-01-01' }]
    }
    void storage.save(data)

    const target = join(dir, 'export.json')
    await exportData(storage, target)
    const exported: unknown = JSON.parse(await readFile(target, 'utf-8'))
    expect(exported).toEqual(data)
    // Die Datei lässt sich wieder einlesen
    expect(migrate(exported)).toEqual(data)
  })
})

describe('exportFileName', () => {
  it('enthält das Datum', () => {
    expect(exportFileName(new Date(2026, 0, 5))).toBe('FlungDo-Export-2026-01-05.json')
  })
})
