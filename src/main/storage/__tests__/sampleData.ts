import type { AppData, CategoryColor, Priority, Todo } from '@shared/types'

// Testdaten für die Storage-Tests. Bewusst ohne Zufall, damit jeder Lauf gleich ist.

/** Ein kleiner, aber vollständiger Datenstand: alle Felder und Beziehungen kommen vor. */
export function richSample(): AppData {
  return {
    version: 4,
    // Absichtlich nicht alphabetisch – die Reihenfolge muss erhalten bleiben
    categories: [
      { id: 'c-uni', name: 'Uni', farbe: 'purple' },
      { id: 'c-sport', name: 'Sport', farbe: 'green' },
      { id: 'c-alt', name: 'Archiv', farbe: 'gray' }
    ],
    deadlines: [
      { id: 'd-2', titel: 'Später', datum: '2026-12-01', erledigt: true, prioritaet: 2 },
      { id: 'd-1', titel: 'Abgabe', datum: '2026-11-05', erledigt: false, prioritaet: 5 },
      { id: 'd-frei', titel: 'Ohne Todo', datum: '2026-11-20', erledigt: false, prioritaet: 3 }
    ],
    todos: [
      {
        id: 't-1',
        titel: 'Übungsblatt',
        erledigt: false,
        erstelltAm: '2026-10-29T08:00:00.000Z',
        prioritaet: 4,
        unteraufgaben: [
          { id: 's-2', titel: 'Aufgabe 2', erledigt: false },
          { id: 's-1', titel: 'Aufgabe 1', erledigt: true }
        ],
        categoryId: 'c-uni',
        datum: '2026-11-03',
        deadlineId: 'd-1'
      },
      {
        // Ohne Datum und ohne Deadline: die Felder dürfen nach dem Laden nicht auftauchen
        id: 't-2',
        titel: 'Gym',
        erledigt: true,
        erstelltAm: '2026-10-30T18:30:00.000Z',
        prioritaet: 1,
        unteraufgaben: [],
        categoryId: 'c-sport'
      },
      {
        // Nur Deadline, kein eigenes Datum
        id: 't-3',
        titel: 'Vorbereiten',
        erledigt: false,
        erstelltAm: '2026-10-31T10:00:00.000Z',
        prioritaet: 3,
        unteraufgaben: [{ id: 's-3', titel: 'Folien', erledigt: false }],
        categoryId: 'c-uni',
        deadlineId: 'd-2'
      }
    ],
    exams: [
      { id: 'e-2', titel: 'Analysis', datum: '2027-02-20' },
      { id: 'e-1', titel: 'Statistik', datum: '2027-02-09' }
    ]
  }
}

/** Texte, an denen Speicherformate gern scheitern. */
export const TRICKY_TEXTS = [
  'Ä Ö Ü ä ö ü ß – „Anführungszeichen“ »französisch«',
  '"doppelt" und \'einfach\' und `Backticks`',
  'Backslash \\ und \\n (kein Zeilenumbruch)',
  'echter\nZeilenumbruch\tund Tab',
  "'); DROP TABLE todos; --",
  '%_ Platzhalter für LIKE',
  'Emoji 🎓📚✅ und zusammengesetzt 👩‍💻 🏳️‍🌈',
  '中文 · العربية · עברית · 日本語',
  '   führende und folgende Leerzeichen   ',
  'x'.repeat(5000)
]

export function trickySample(): AppData {
  const data = richSample()
  data.categories = [{ id: 'c-🎓', name: TRICKY_TEXTS[6]!, farbe: 'blue' }]
  data.todos = TRICKY_TEXTS.map((titel, i) => ({
    id: `t-${i}-"${i}"`,
    titel,
    erledigt: i % 2 === 0,
    erstelltAm: '2026-10-29T08:00:00.000Z',
    prioritaet: 3,
    unteraufgaben: [
      { id: `s-${i}`, titel: TRICKY_TEXTS[TRICKY_TEXTS.length - 1 - i]!, erledigt: false }
    ],
    categoryId: 'c-🎓'
  }))
  data.deadlines = [
    { id: "d-'", titel: TRICKY_TEXTS[4]!, datum: '2026-11-05', erledigt: false, prioritaet: 3 }
  ]
  data.exams = [{ id: 'e-ß', titel: TRICKY_TEXTS[0]!, datum: '2027-01-01' }]
  return data
}

const COLORS: readonly CategoryColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'gray'
]

/**
 * Großer Datenstand: `todoCount` Todos in 8 Kategorien, jedes dritte mit Unteraufgaben,
 * jedes zehnte mit Deadline, verteilt über ein Jahr.
 */
export function largeSample(todoCount: number): AppData {
  const categories = COLORS.concat('blue').map((farbe, i) => ({
    id: `c-${i}`,
    name: `Kategorie ${i}`,
    farbe
  }))
  const deadlines: AppData['deadlines'] = []
  const todos: Todo[] = []
  const start = Date.UTC(2026, 0, 1)
  for (let i = 0; i < todoCount; i++) {
    const datum = new Date(start + (i % 365) * 86_400_000).toISOString().slice(0, 10)
    const todo: Todo = {
      id: `t-${i}`,
      titel: `Todo Nummer ${i}`,
      erledigt: i % 4 === 0,
      erstelltAm: new Date(start + i * 60_000).toISOString(),
      prioritaet: ((i % 5) + 1) as Priority,
      unteraufgaben:
        i % 3 === 0
          ? [0, 1, 2].map((k) => ({ id: `s-${i}-${k}`, titel: `Schritt ${k}`, erledigt: k === 0 }))
          : [],
      categoryId: `c-${i % categories.length}`
    }
    if (i % 7 !== 0) todo.datum = datum
    if (i % 10 === 0) {
      const deadlineId = `d-${i}`
      deadlines.push({
        id: deadlineId,
        titel: `Deadline ${i}`,
        datum,
        erledigt: false,
        prioritaet: 4
      })
      todo.deadlineId = deadlineId
    }
    todos.push(todo)
  }
  const exams = Array.from({ length: 20 }, (_, i) => ({
    id: `e-${i}`,
    titel: `Prüfung ${i}`,
    datum: new Date(start + i * 15 * 86_400_000).toISOString().slice(0, 10)
  }))
  return { version: 4, categories, todos, deadlines, exams }
}
