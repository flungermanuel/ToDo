import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import {
  exportData,
  exportFileName,
  importData,
  ImportError,
  readImportFile,
  summarize
} from '../dataTransfer'
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

describe('Import', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'flungdo-import-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function file(name: string, content: string): Promise<string> {
    const path = join(dir, name)
    await writeFile(path, content, 'utf-8')
    return path
  }

  it('liest eine ältere Version und migriert sie', async () => {
    const path = await file(
      'alt.json',
      JSON.stringify({ version: 1, todos: [{ id: 't1', titel: 'Gym' }], deadlines: [] })
    )
    const data = await readImportFile(path)
    expect(data.version).toBe(4)
    expect(data.todos[0]).toMatchObject({ titel: 'Gym', categoryId: 'cat-persoenlich' })
  })

  it('meldet unlesbare Dateien verständlich', async () => {
    await expect(readImportFile(join(dir, 'fehlt.json'))).rejects.toThrow(
      new ImportError('Die Datei konnte nicht gelesen werden.')
    )
    await expect(readImportFile(await file('kaputt.json', '{ nein'))).rejects.toThrow(
      'keine gültige JSON-Datei'
    )
    await expect(readImportFile(await file('fremd.json', '{"version": 99}'))).rejects.toThrow(
      'keine FlungDo-Daten (Unbekannte Datenversion: 99)'
    )
  })

  it('sichert den bisherigen Stand und ersetzt ihn dann', async () => {
    const dataFile = join(dir, 'todo-data.json')
    const storage = new JsonStorage(dataFile)
    const before = emptyAppData()
    await storage.save(before)

    const imported: AppData = {
      ...emptyAppData(),
      exams: [{ id: 'e1', titel: 'X', datum: '2027-01-01' }]
    }
    await importData(storage, imported)

    expect(JSON.parse(await readFile(dataFile, 'utf-8'))).toEqual(imported)
    const backup = (await readdir(dir)).find((n) => n.startsWith('todo-data.backup-import-'))
    expect(backup).toBeDefined()
    expect(JSON.parse(await readFile(join(dir, backup!), 'utf-8'))).toEqual(before)
  })

  it('importiert auch, wenn es noch nichts zu sichern gibt', async () => {
    const storage = new JsonStorage(join(dir, 'todo-data.json'))
    await importData(storage, emptyAppData())
    expect(await readdir(dir)).toEqual(['todo-data.json'])
  })

  it('zählt den Inhalt für die Nachfrage', () => {
    const data = emptyAppData()
    data.todos = [
      {
        id: 't1',
        titel: 'A',
        erledigt: false,
        erstelltAm: '',
        prioritaet: 3,
        categoryId: 'cat-studium',
        unteraufgaben: [
          { id: 's1', titel: '1', erledigt: false },
          { id: 's2', titel: '2', erledigt: true }
        ]
      }
    ]
    expect(summarize(data)).toEqual({
      categories: 2,
      todos: 1,
      subtasks: 2,
      deadlines: 0,
      exams: 0
    })
  })
})

describe('exportFileName', () => {
  it('enthält das Datum', () => {
    expect(exportFileName(new Date(2026, 0, 5))).toBe('FlungDo-Export-2026-01-05.json')
  })
})
