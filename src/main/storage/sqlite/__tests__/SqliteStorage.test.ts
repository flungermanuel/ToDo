import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AppData } from '@shared/types'
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

  describe('nur Änderungen schreiben: knifflige Fälle', () => {
    /** Speichert `change(richSample())` nach dem Ausgangsstand und prüft beim Neuladen */
    async function expectRoundtrip(change: (data: AppData) => AppData) {
      await storage.save(richSample())
      await storage.load() // Ausgangsstand ist jetzt bekannt → nächster Save schreibt nur Unterschiede
      const changed = change(richSample())
      await storage.save(changed)
      await storage.close()
      storage = new SqliteStorage(join(dir, 'flungdo.db'))
      expect(await storage.load()).toStrictEqual(changed)
    }

    it('Deadline wandert in einem Save von einem Todo zum anderen (UNIQUE)', () =>
      expectRoundtrip((d) => {
        delete d.todos[0]!.deadlineId // t-1 hatte d-1
        d.todos[1]!.deadlineId = 'd-1' // t-2 bekommt sie
        return d
      }))

    it('zwei Todos tauschen ihre Deadlines', () =>
      expectRoundtrip((d) => {
        d.todos[0]!.deadlineId = 'd-2'
        d.todos[2]!.deadlineId = 'd-1'
        return d
      }))

    it('Kategorie löschen, Todos vorher in eine neue Kategorie verschieben', () =>
      expectRoundtrip((d) => {
        d.categories = [{ id: 'c-neu', name: 'Neu', farbe: 'red' }, ...d.categories]
        d.categories = d.categories.filter((c) => c.id !== 'c-uni')
        for (const t of d.todos) if (t.categoryId === 'c-uni') t.categoryId = 'c-neu'
        return d
      }))

    it('Todo mit Unteraufgaben und verknüpfter Deadline löschen', () =>
      expectRoundtrip((d) => {
        d.todos = d.todos.filter((t) => t.id !== 't-1')
        d.deadlines = d.deadlines.filter((x) => x.id !== 'd-1')
        return d
      }))

    it('Reihenfolge ändern, Unteraufgabe umbenennen, Prüfung ersetzen', () =>
      expectRoundtrip((d) => {
        d.categories.reverse()
        d.todos.reverse()
        d.todos[2]!.unteraufgaben[0]!.titel = 'Umbenannt'
        d.todos[2]!.unteraufgaben.push({ id: 's-neu', titel: 'Neu', erledigt: true })
        d.exams = [{ id: 'e-3', titel: 'Neu', datum: '2027-03-01' }]
        return d
      }))

    it('ein abgelehnter Save verfälscht den Abgleich danach nicht', async () => {
      await storage.save(richSample())
      const broken = richSample()
      broken.todos[0]!.categoryId = 'gibt-es-nicht'
      await expect(storage.save(broken)).rejects.toThrow()
      // Der nächste Save muss wieder vom tatsächlichen Stand ausgehen
      const ok = richSample()
      ok.todos[0]!.titel = 'Nach dem Fehler'
      await storage.save(ok)
      expect(await storage.load()).toStrictEqual(ok)
    })
  })

  it('nach close() sind weitere Zugriffe ein klarer Fehler, erneutes close() schadet nicht', async () => {
    await storage.close()
    await expect(storage.load()).rejects.toThrow('geschlossen')
    await expect(storage.close()).resolves.toBeUndefined()
  })
})
