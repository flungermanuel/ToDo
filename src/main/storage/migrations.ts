import {
  CURRENT_VERSION,
  PRIORITIES,
  emptyAppData,
  type AppData,
  type Deadline,
  type Priority,
  type Subtask,
  type Todo
} from '@shared/types'

// Liest beliebigen Inhalt aus der Datei und macht daraus gültige AppData.
// Kaputte Einträge werden verworfen statt die ganze App abstürzen zu lassen.
// Wenn sich das Datenmodell ändert, kommt hier ein Schritt "version 1 → 2" dazu.

export class UnreadableDataError extends Error {}

export function migrate(raw: unknown): AppData {
  if (!isObject(raw)) throw new UnreadableDataError('Datei enthält kein Objekt')
  if (raw['version'] !== CURRENT_VERSION) {
    throw new UnreadableDataError(`Unbekannte Datenversion: ${String(raw['version'])}`)
  }

  const data = emptyAppData()
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
    })
  }
  if (isString(value['deadlineId'])) todo.deadlineId = value['deadlineId']
  return todo
}

function toSubtask(value: unknown): Subtask | null {
  if (!isObject(value) || !isString(value['id']) || !isString(value['titel'])) return null
  return { id: value['id'], titel: value['titel'], erledigt: value['erledigt'] === true }
}

function toDeadline(value: unknown): Deadline | null {
  if (!isObject(value) || !isString(value['id']) || !isString(value['titel'])) return null
  if (!isString(value['datum']) || !/^\d{4}-\d{2}-\d{2}$/.test(value['datum'])) return null
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
