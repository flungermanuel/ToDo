import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import { JsonStorage } from '../JsonStorage'
import { migrate, UnreadableDataError } from '../migrations'

const sample: AppData = {
  version: 1,
  deadlines: [{ id: 'd1', titel: 'Abgabe', datum: '2026-11-05', erledigt: false, prioritaet: 4 }],
  todos: [
    {
      id: 't1',
      titel: 'Rechnen',
      erledigt: true,
      erstelltAm: '2026-10-29T08:00:00.000Z',
      prioritaet: 3,
      unteraufgaben: [{ id: 's1', titel: 'Aufgabe 1', erledigt: true }],
      deadlineId: 'd1'
    }
  ]
}

describe('migrate', () => {
  it('übernimmt gültige Daten unverändert', () => {
    expect(migrate(structuredClone(sample))).toEqual(sample)
  })

  it('lehnt fremde Formate und unbekannte Versionen ab', () => {
    expect(() => migrate(null)).toThrow(UnreadableDataError)
    expect(() => migrate([])).toThrow(UnreadableDataError)
    expect(() => migrate({ version: 99 })).toThrow(UnreadableDataError)
  })

  it('verwirft kaputte Einträge und repariert Felder', () => {
    const result = migrate({
      version: 1,
      deadlines: [
        { id: 'd1', titel: 'Ok', datum: '2026-11-05' },
        { id: 'd2', titel: 'Kein Datum' }
      ],
      todos: [
        { id: 't1', titel: 'Ok', prioritaet: 9, deadlineId: 'd1' },
        { id: 't2', titel: 'Doppelt verknüpft', deadlineId: 'd1' },
        { id: 't3', titel: 'Verweis ins Leere', deadlineId: 'weg' },
        { titel: 'ohne id' }
      ]
    })
    expect(result.deadlines.map((d) => d.id)).toEqual(['d1'])
    expect(result.todos.map((t) => [t.id, t.prioritaet, t.deadlineId])).toEqual([
      ['t1', 3, 'd1'],
      ['t2', 3, undefined],
      ['t3', 3, undefined]
    ])
  })
})

describe('JsonStorage', () => {
  let dir: string
  let file: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'todo-test-'))
    file = join(dir, 'todo-data.json')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('startet leer, wenn noch keine Datei existiert', async () => {
    expect(await new JsonStorage(file).load()).toEqual(emptyAppData())
  })

  it('speichert und lädt dieselben Daten', async () => {
    const storage = new JsonStorage(file)
    await storage.save(sample)
    expect(await new JsonStorage(file).load()).toEqual(sample)
    // keine .tmp-Datei bleibt liegen
    expect(await readdir(dir)).toEqual(['todo-data.json'])
  })

  it('der letzte von mehreren schnellen Saves gewinnt', async () => {
    const storage = new JsonStorage(file)
    void storage.save(emptyAppData())
    void storage.save(sample)
    await storage.flush()
    expect(JSON.parse(await readFile(file, 'utf-8'))).toEqual(sample)
  })

  it('legt kaputte Dateien als Backup ab und startet leer', async () => {
    await writeFile(file, '{ kaputt', 'utf-8')
    expect(await new JsonStorage(file).load()).toEqual(emptyAppData())
    const files = await readdir(dir)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^todo-data\.json\.corrupt-\d+$/)
  })
})
