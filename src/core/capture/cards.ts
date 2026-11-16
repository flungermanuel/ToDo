import {
  DEFAULT_PRIORITY,
  type AppData,
  type Category,
  type IsoDate,
  type Priority
} from '@shared/types'
import type { CaptureType, ParsedEntry } from '@shared/capture'
import { defaultContext, type CoreContext } from '../context'
import { isValidIsoDate } from '../dates'
import { createDeadline } from '../deadlines'
import { createExam } from '../exams'
import { cleanTitle } from '../text'
import { createTodo, withoutDeadline } from '../todos'
import { MAX_TITLE_LENGTH } from './schema'
import { matchCategory } from './validate'

// Vorschau-Karten: Zwischenstand zwischen "Modell hat geantwortet" und "gespeichert".
// Eine Karte ist bearbeitbar; erst applyCards legt über die normalen Core-Funktionen an.

export interface CaptureCard {
  /** Nur zur Unterscheidung in der Liste, kein Datenbank-Schlüssel */
  key: string
  typ: CaptureType
  titel: string
  /** null = fehlt noch (bei Deadline und Prüfung Pflicht, beim Todo erlaubt) */
  datum: IsoDate | null
  categoryId: string
  prioritaet: Priority
  /** Nur bei Deadlines: zusätzlich ein verknüpftes Todo anlegen (Standard: aus) */
  mitTodo: boolean
}

export function cardsFromEntries(
  entries: readonly ParsedEntry[],
  categories: readonly Category[],
  currentCategoryId: string | undefined,
  ctx: CoreContext = defaultContext
): CaptureCard[] {
  return entries.map((entry) => ({
    key: ctx.newId(),
    typ: entry.typ,
    titel: entry.titel,
    datum: entry.datum,
    categoryId: matchCategory(entry.kategorie, categories, currentCategoryId),
    prioritaet: entry.prioritaet ?? DEFAULT_PRIORITY,
    mitTodo: false
  }))
}

/**
 * Die Karte für den Notfall: Der Rohtext wird zum Titel eines normalen Todos, das man
 * selbst ausfüllt. So geht nichts verloren, wenn die Analyse nicht klappt.
 */
export function fallbackCard(
  text: string,
  categories: readonly Category[],
  currentCategoryId: string | undefined,
  ctx: CoreContext = defaultContext
): CaptureCard {
  const titel = (cleanTitle(text) ?? '').slice(0, MAX_TITLE_LENGTH).trimEnd()
  return {
    key: ctx.newId(),
    typ: 'todo',
    titel,
    datum: null,
    categoryId: matchCategory('', categories, currentCategoryId),
    prioritaet: DEFAULT_PRIORITY,
    mitTodo: false
  }
}

// --- Prüfen ---

export type CardIssue = 'titel' | 'datum'

/** Was an der Karte noch fehlt (null = übernehmbar). */
export function cardIssue(card: CaptureCard): CardIssue | null {
  if (!cleanTitle(card.titel)) return 'titel'
  const needsDate = card.typ === 'deadline' || card.typ === 'pruefung'
  if (needsDate && (!card.datum || !isValidIsoDate(card.datum))) return 'datum'
  return null
}

/** "Übernehmen" ist erst möglich, wenn es Karten gibt und alle vollständig sind. */
export function canApply(cards: readonly CaptureCard[]): boolean {
  return cards.length > 0 && cards.every((card) => cardIssue(card) === null)
}

// --- Anlegen und Rückgängig ---

export interface CreatedIds {
  todos: string[]
  deadlines: string[]
  exams: string[]
}

/** Legt alle Karten über die bestehenden Core-Funktionen an und merkt sich die neuen IDs. */
export function applyCards(
  data: AppData,
  cards: readonly CaptureCard[],
  ctx: CoreContext = defaultContext
): { data: AppData; created: CreatedIds } {
  const created: CreatedIds = { todos: [], deadlines: [], exams: [] }
  let current = data

  for (const card of cards) {
    if (cardIssue(card) !== null) continue
    const datum = card.datum ?? undefined

    if (card.typ === 'todo') {
      current = add(current, 'todos', created.todos, (d) =>
        createTodo(
          d,
          { titel: card.titel, categoryId: card.categoryId, prioritaet: card.prioritaet, datum },
          ctx
        )
      )
    } else if (card.typ === 'pruefung') {
      current = add(current, 'exams', created.exams, (d) =>
        createExam(d, { titel: card.titel, datum: datum! }, ctx)
      )
    } else {
      current = add(current, 'deadlines', created.deadlines, (d) =>
        createDeadline(d, { titel: card.titel, datum: datum!, prioritaet: card.prioritaet }, ctx)
      )
      const deadlineId = created.deadlines[created.deadlines.length - 1]
      if (card.mitTodo && deadlineId) {
        // Das Todo bekommt kein eigenes Datum: Es gilt das der verknüpften Deadline
        current = add(current, 'todos', created.todos, (d) =>
          createTodo(
            d,
            {
              titel: card.titel,
              categoryId: card.categoryId,
              prioritaet: card.prioritaet,
              deadlineId
            },
            ctx
          )
        )
      }
    }
  }
  return { data: current, created }
}

/** Führt `create` aus und merkt sich die ID, die dabei neu in `key` hinzugekommen ist. */
function add(
  data: AppData,
  key: 'todos' | 'deadlines' | 'exams',
  ids: string[],
  create: (data: AppData) => AppData
): AppData {
  const next = create(data)
  const known = new Set(data[key].map((item) => item.id))
  for (const item of next[key]) if (!known.has(item.id)) ids.push(item.id)
  return next
}

/**
 * Macht applyCards rückgängig, indem genau die angelegten Einträge gelöscht werden –
 * nicht der ganze Stand zurückgesetzt. Was man in der Zwischenzeit geändert hat, bleibt.
 */
export function removeCreated(data: AppData, created: CreatedIds): AppData {
  const todos = new Set(created.todos)
  const deadlines = new Set(created.deadlines)
  const exams = new Set(created.exams)
  return {
    ...data,
    // Ein inzwischen verknüpftes anderes Todo verliert nur die Verknüpfung
    todos: data.todos
      .filter((t) => !todos.has(t.id))
      .map((t) => (t.deadlineId && deadlines.has(t.deadlineId) ? withoutDeadline(t) : t)),
    deadlines: data.deadlines.filter((d) => !deadlines.has(d.id)),
    exams: data.exams.filter((e) => !exams.has(e.id))
  }
}

/** Anzahl der angelegten Einträge für die Meldung "3 Einträge angelegt" */
export function countCreated(created: CreatedIds): number {
  return created.todos.length + created.deadlines.length + created.exams.length
}
