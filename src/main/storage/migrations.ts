import {
  CATEGORY_COLORS,
  LEGACY_CATEGORY_ID,
  PRIORITIES,
  emptyAppData,
  type AppData,
  type Category,
  type CategoryColor,
  type Deadline,
  type Priority,
  type Subtask,
  type Todo
} from '@shared/types'

// Liest beliebigen Inhalt aus der Datei und macht daraus gültige AppData.
// Kaputte Einträge werden verworfen statt die ganze App abstürzen zu lassen.
//
// Versionen:
//   1 (V1)   – ohne Kategorien → Startkategorien anlegen, alle Todos nach "Persönlich"
//   2 (V1.1) – mit Kategorien
//   3 (V1.2) – Todos mit optionalem Datum; ältere Todos bleiben "ohne Datum"

export class UnreadableDataError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function migrate(raw: unknown): AppData {
  if (!isObject(raw)) throw new UnreadableDataError('Datei enthält kein Objekt')
  const version = raw['version']
  if (version !== 1 && version !== 2 && version !== 3) {
    throw new UnreadableDataError(`Unbekannte Datenversion: ${String(version)}`)
  }

  // emptyAppData() enthält schon die Startkategorien – für Version 1 bleiben sie so
  const data = emptyAppData()
  if (version >= 2) {
    const seen = new Set<string>()
    const categories = asArray(raw['categories']).flatMap((c) => {
      const category = toCategory(c)
      if (!category || seen.has(category.id)) return []
      seen.add(category.id)
      return [category]
    })
    // Es muss immer mindestens eine Kategorie geben
    if (categories.length > 0) data.categories = categories
  }

  const categoryIds = new Set(data.categories.map((c) => c.id))
  const fallbackCategoryId = categoryIds.has(LEGACY_CATEGORY_ID)
    ? LEGACY_CATEGORY_ID
    : data.categories[0]!.id
  data.deadlines = asArray(raw['deadlines']).flatMap((d) => {
    const deadline = toDeadline(d)
    return deadline ? [deadline] : []
  })

  const deadlineIds = new Set(data.deadlines.map((d) => d.id))
  const linked = new Set<string>()
  data.todos = asArray(raw['todos']).flatMap((t) => {
    const todo = toTodo(t)
    if (!todo) return []
    // Verweise auf gelöschte Deadlines und doppelte Verknüpfungen (1:1) entfernen
    if (todo.deadlineId && (!deadlineIds.has(todo.deadlineId) || linked.has(todo.deadlineId))) {
      delete todo.deadlineId
    }
    if (todo.deadlineId) linked.add(todo.deadlineId)
    // Todos ohne (gültige) Kategorie – z. B. alle aus V1 – bekommen die Ersatzkategorie
    if (!categoryIds.has(todo.categoryId)) todo.categoryId = fallbackCategoryId
    return [todo]
  })

  return data
}

function toTodo(value: unknown): Todo | null {
  if (!isObject(value) || !isString(value['id']) || !isString(value['titel'])) return null
  const todo: Todo = {
    id: value['id'],
    titel: value['titel'],
    erledigt: value['erledigt'] === true,
    erstelltAm: isString(value['erstelltAm']) ? value['erstelltAm'] : new Date(0).toISOString(),
    prioritaet: toPriority(value['prioritaet']),
    unteraufgaben: asArray(value['unteraufgaben']).flatMap((s) => {
      const subtask = toSubtask(s)
      return subtask ? [subtask] : []
    }),
    categoryId: isString(value['categoryId']) ? value['categoryId'] : ''
  }
  if (isString(value['deadlineId'])) todo.deadlineId = value['deadlineId']
  if (isString(value['datum']) && ISO_DATE.test(value['datum'])) todo.datum = value['datum']
  return todo
}

function toCategory(value: unknown): Category | null {
  if (!isObject(value) || !isString(value['id']) || !isString(value['name'])) return null
  const farbe = CATEGORY_COLORS.includes(value['farbe'] as CategoryColor)
    ? (value['farbe'] as CategoryColor)
    : 'gray'
  return { id: value['id'], name: value['name'], farbe }
}

function toSubtask(value: unknown): Subtask | null {
  if (!isObject(value) || !isString(value['id']) || !isString(value['titel'])) return null
  return { id: value['id'], titel: value['titel'], erledigt: value['erledigt'] === true }
}

function toDeadline(value: unknown): Deadline | null {
  if (!isObject(value) || !isString(value['id']) || !isString(value['titel'])) return null
  if (!isString(value['datum']) || !ISO_DATE.test(value['datum'])) return null
  return {
    id: value['id'],
    titel: value['titel'],
    datum: value['datum'],
    erledigt: value['erledigt'] === true,
    prioritaet: toPriority(value['prioritaet'])
  }
}

function toPriority(value: unknown): Priority {
  return PRIORITIES.includes(value as Priority) ? (value as Priority) : 3
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}
