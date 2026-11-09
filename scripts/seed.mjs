// Erzeugt Testdaten für Performance-Messungen (docs/performance.md).
//
//   node scripts/seed.mjs <Zielordner> [Anzahl …]
//   node scripts/seed.mjs perf-data              → 1000, 5000 und 10000 Todos
//
// Ergebnis: <Zielordner>/<Anzahl>/todo-data.json im Format von FlungDo (Version 4).
// Startet man die App mit FLUNGDO_DATA_DIR=<Zielordner>/<Anzahl>, übernimmt sie die Datei
// beim ersten Start in die Datenbank (flungdo.db) – derselbe Weg wie beim Update von 1.x.
// Mit FLUNGDO_STORAGE=json bleibt sie bei der JSON-Datei (zum Vergleich).
//
// Die Daten sind nicht zufällig, sondern bei jedem Lauf gleich (bis auf das heutige Datum,
// um das herum sie verteilt werden), damit Messungen vergleichbar bleiben.

import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray', 'blue']
const DAY_MS = 86_400_000

/** Kalendertag als "YYYY-MM-DD" in lokaler Zeit, `offset` Tage von heute */
function isoDay(offset) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * `count` Todos in 8 Kategorien, verteilt über ±6 Monate um heute:
 * jedes 3. mit 3 Unteraufgaben, jedes 7. ohne Datum, jedes 10. mit verknüpfter Deadline,
 * vergangene Todos größtenteils erledigt.
 */
function generate(count) {
  const categories = COLORS.map((farbe, i) => ({ id: `c-${i}`, name: `Kategorie ${i}`, farbe }))
  const todos = []
  const deadlines = []
  const created = Date.now() - 200 * DAY_MS
  for (let i = 0; i < count; i++) {
    const offset = (i % 365) - 182
    const todo = {
      id: `t-${i}`,
      titel: `Todo Nummer ${i}`,
      erledigt: offset < 0 ? i % 5 !== 0 : i % 6 === 0,
      erstelltAm: new Date(created + i * 60_000).toISOString(),
      prioritaet: (i % 5) + 1,
      unteraufgaben:
        i % 3 === 0
          ? [0, 1, 2].map((k) => ({ id: `s-${i}-${k}`, titel: `Schritt ${k}`, erledigt: k === 0 }))
          : [],
      categoryId: `c-${i % categories.length}`
    }
    if (i % 7 !== 0) todo.datum = isoDay(offset)
    if (i % 10 === 0) {
      const deadline = {
        id: `d-${i}`,
        titel: `Deadline ${i}`,
        datum: isoDay(offset),
        erledigt: false,
        prioritaet: 4
      }
      deadlines.push(deadline)
      todo.deadlineId = deadline.id
    }
    todos.push(todo)
  }
  const exams = Array.from({ length: 20 }, (_, i) => ({
    id: `e-${i}`,
    titel: `Prüfung ${i}`,
    datum: isoDay(i * 15 - 60)
  }))
  return { version: 4, categories, todos, deadlines, exams }
}

async function main() {
  const [target, ...counts] = process.argv.slice(2)
  if (!target) {
    console.error('Aufruf: node scripts/seed.mjs <Zielordner> [Anzahl …]')
    process.exit(1)
  }
  const sizes = counts.length > 0 ? counts.map(Number) : [1000, 5000, 10000]
  for (const size of sizes) {
    const dir = join(resolve(target), String(size))
    await mkdir(dir, { recursive: true })
    const file = join(dir, 'todo-data.json')
    await writeFile(file, JSON.stringify(generate(size), null, 2), 'utf-8')
    console.log(`${size} Todos → ${file}`)
  }
}

await main()
