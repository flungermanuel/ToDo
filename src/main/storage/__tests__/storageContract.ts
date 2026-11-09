import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import type { Storage } from '../Storage'
import { largeSample, richSample, trickySample } from './sampleData'

/**
 * Vertragstests: Was jede Storage-Implementierung erfüllen muss, egal ob JSON oder SQLite.
 * Jede Implementierung ruft diese Funktion in ihrer eigenen Testdatei auf.
 *
 * `create(dir)` legt eine Storage an, die ihre Daten im (leeren) Ordner `dir` ablegt.
 * Zweimal mit demselben Ordner aufgerufen = App neu gestartet.
 */
export function runStorageContract(name: string, create: (dir: string) => Storage): void {
  describe(`Storage-Vertrag: ${name}`, () => {
    let dir: string
    const opened: Storage[] = []

    function open(): Storage {
      const storage = create(dir)
      opened.push(storage)
      return storage
    }

    /** Speichern, schließen, neu öffnen, laden – wie ein Neustart der App */
    async function roundtrip(data: AppData): Promise<AppData> {
      const first = open()
      await first.save(data)
      await first.close()
      return open().load()
    }

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'flungdo-contract-'))
    })

    afterEach(async () => {
      await Promise.all(opened.splice(0).map((s) => s.close()))
      await rm(dir, { recursive: true, force: true })
    })

    it('startet leer mit den Startkategorien', async () => {
      expect(await open().load()).toStrictEqual(emptyAppData())
    })

    it('speichern und laden ergibt exakt dieselben Daten (inkl. Reihenfolge)', async () => {
      expect(await roundtrip(richSample())).toStrictEqual(richSample())
    })

    it('Beziehungen bleiben erhalten: Kategorie, Unteraufgaben, Todo ↔ Deadline', async () => {
      const loaded = await roundtrip(richSample())
      const todo = loaded.todos.find((t) => t.id === 't-1')!
      expect(todo.categoryId).toBe('c-uni')
      expect(todo.unteraufgaben.map((s) => s.id)).toEqual(['s-2', 's-1'])
      expect(todo.deadlineId).toBe('d-1')
      expect(loaded.deadlines.some((d) => d.id === todo.deadlineId)).toBe(true)
      // Deadline ohne Todo bleibt ebenfalls bestehen
      expect(loaded.deadlines.map((d) => d.id)).toContain('d-frei')
    })

    it('optionale Felder fehlen nach dem Laden wirklich (nicht undefined oder null)', async () => {
      const gym = (await roundtrip(richSample())).todos.find((t) => t.id === 't-2')!
      expect('datum' in gym).toBe(false)
      expect('deadlineId' in gym).toBe(false)
    })

    it('Sonderzeichen, Emojis und SQL-artige Texte überstehen den Weg', async () => {
      expect(await roundtrip(trickySample())).toStrictEqual(trickySample())
    })

    it('große Datenmengen (10.000 Todos)', async () => {
      const big = largeSample(10_000)
      const loaded = await roundtrip(big)
      expect(loaded.todos).toHaveLength(10_000)
      expect(loaded).toStrictEqual(big)
    }, 30_000)

    it('Gelöschtes verschwindet beim nächsten Speichern', async () => {
      const storage = open()
      await storage.save(richSample())
      const smaller = richSample()
      smaller.todos = smaller.todos.filter((t) => t.id !== 't-1')
      smaller.deadlines = smaller.deadlines.filter((d) => d.id !== 'd-1')
      smaller.exams = []
      await storage.save(smaller)
      await storage.close()
      expect(await open().load()).toStrictEqual(smaller)
    })

    it('der letzte von mehreren schnellen Saves gewinnt', async () => {
      const storage = open()
      const changed = richSample()
      changed.todos[0]!.titel = 'Geändert'
      void storage.save(emptyAppData())
      void storage.save(richSample())
      void storage.save(changed)
      await storage.flush()
      expect(await storage.load()).toStrictEqual(changed)
    })

    it('backup: null, solange nichts gespeichert ist, danach ein Pfad', async () => {
      const storage = open()
      expect(await storage.backup('test')).toBeNull()
      await storage.save(richSample())
      const path = await storage.backup('test')
      expect(path).toEqual(expect.stringContaining('test'))
    })
  })
}
