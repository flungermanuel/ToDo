import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, test } from 'vitest'
import type { AppData } from '@shared/types'
import { JsonStorage } from '../JsonStorage'
import type { Storage } from '../Storage'
import { SqliteStorage } from '../sqlite/SqliteStorage'
import { largeSample } from '../__tests__/sampleData'

// Reine Speicher-Messung ohne App, IPC und UI: Wie lange brauchen load() und save()
// eines kompletten Datenstands? Aufruf: npm run bench
// Ergebnisse stehen in docs/performance.md.

const SIZES = [1_000, 5_000, 10_000]
const dirs: string[] = []
const storages: Storage[] = []

function setup(create: (dir: string) => Storage): Storage {
  const dir = mkdtempSync(join(tmpdir(), 'flungdo-bench-'))
  dirs.push(dir)
  const storage = create(dir)
  storages.push(storage)
  return storage
}

afterAll(async () => {
  // Erst schließen – unter Windows lässt sich eine offene Datenbank nicht löschen
  await Promise.all(storages.map((s) => s.close()))
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

for (const size of SIZES) {
  const data = largeSample(size)
  // Eine kleine Änderung, wie sie beim Abhaken entsteht
  const changed: AppData = {
    ...data,
    todos: data.todos.map((t, i) => (i === 0 ? { ...t, erledigt: !t.erledigt } : t))
  }

  const json = setup((dir) => new JsonStorage(join(dir, 'todo-data.json')))
  const sqlite = setup((dir) => new SqliteStorage(join(dir, 'flungdo.db')))
  await json.save(data)
  await sqlite.save(data)

  // Vitest 5: bench ist ein Test-Kontext, bench.compare stellt die Varianten gegenüber
  test(`${size} Todos: laden`, async ({ bench }) => {
    await bench.compare(
      bench('JSON', () => json.load().then(() => {})),
      bench('SQLite', () => sqlite.load().then(() => {})),
      { iterations: 20 }
    )
  })

  test(`${size} Todos: speichern (ganzer Stand)`, async ({ bench }) => {
    // Abwechselnd geänderter und ursprünglicher Stand, damit wirklich etwas zu schreiben ist
    let flip = false
    const next = () => {
      flip = !flip
      return flip ? changed : data
    }
    await bench.compare(
      bench('JSON', () => json.save(next())),
      bench('SQLite', () => sqlite.save(next())),
      { iterations: 20 }
    )
  })
}
