import { DEFAULT_PRIORITY, type AppData, type Priority, type Todo } from '@shared/types'
import { defaultContext, type CoreContext } from './context'
import { cleanTitle } from './text'

// Alle Funktionen sind rein: Sie bekommen AppData und geben neue AppData zurück,
// ohne das Original zu verändern. Ungültige Eingaben (leerer Titel, unbekannte ID)
// lassen die Daten unverändert.

export interface NewTodo {
  titel: string
  prioritaet?: Priority
  deadlineId?: string
}

export function createTodo(
  data: AppData,
  input: NewTodo,
  ctx: CoreContext = defaultContext
): AppData {
  const titel = cleanTitle(input.titel)
  if (!titel) return data

  const todo: Todo = {
    id: ctx.newId(),
    titel,
    erledigt: false,
    erstelltAm: ctx.now().toISOString(),
    prioritaet: input.prioritaet ?? DEFAULT_PRIORITY,
    unteraufgaben: []
  }
  if (input.deadlineId && data.deadlines.some((d) => d.id === input.deadlineId)) {
    todo.deadlineId = input.deadlineId
  }

  // 1:1-Verknüpfung: Ein anderes Todo, das schon auf diese Deadline zeigt, verliert sie.
  const todos = todo.deadlineId
    ? data.todos.map((t) => (t.deadlineId === todo.deadlineId ? withoutDeadline(t) : t))
    : data.todos

  return { ...data, todos: [...todos, todo] }
}

export interface TodoPatch {
  titel?: string
  prioritaet?: Priority
}

export function updateTodo(data: AppData, id: string, patch: TodoPatch): AppData {
  return mapTodo(data, id, (todo) => {
    const next = { ...todo }
    if (patch.titel !== undefined) {
      const titel = cleanTitle(patch.titel)
      if (titel) next.titel = titel
    }
    if (patch.prioritaet !== undefined) next.prioritaet = patch.prioritaet
    return next
  })
}

export function toggleTodo(data: AppData, id: string): AppData {
  return mapTodo(data, id, (todo) => ({ ...todo, erledigt: !todo.erledigt }))
}

export function deleteTodo(data: AppData, id: string): AppData {
  // Eine verknüpfte Deadline bleibt bestehen – sie gehört nicht dem Todo.
  return { ...data, todos: data.todos.filter((t) => t.id !== id) }
}

// --- Unteraufgaben (nur eine Ebene) ---

export function addSubtask(
  data: AppData,
  todoId: string,
  titel: string,
  ctx: CoreContext = defaultContext
): AppData {
  const clean = cleanTitle(titel)
  if (!clean) return data
  return mapTodo(data, todoId, (todo) => ({
    ...todo,
    unteraufgaben: [...todo.unteraufgaben, { id: ctx.newId(), titel: clean, erledigt: false }]
  }))
}

export function toggleSubtask(data: AppData, todoId: string, subtaskId: string): AppData {
  // Bewusst kein automatisches Abhaken des Todos, wenn alle Unteraufgaben fertig sind.
  return mapTodo(data, todoId, (todo) => ({
    ...todo,
    unteraufgaben: todo.unteraufgaben.map((s) =>
      s.id === subtaskId ? { ...s, erledigt: !s.erledigt } : s
    )
  }))
}

export function renameSubtask(
  data: AppData,
  todoId: string,
  subtaskId: string,
  titel: string
): AppData {
  const clean = cleanTitle(titel)
  if (!clean) return data
  return mapTodo(data, todoId, (todo) => ({
    ...todo,
    unteraufgaben: todo.unteraufgaben.map((s) => (s.id === subtaskId ? { ...s, titel: clean } : s))
  }))
}

export function deleteSubtask(data: AppData, todoId: string, subtaskId: string): AppData {
  return mapTodo(data, todoId, (todo) => ({
    ...todo,
    unteraufgaben: todo.unteraufgaben.filter((s) => s.id !== subtaskId)
  }))
}

export function subtaskProgress(todo: Todo): { erledigt: number; gesamt: number } {
  return {
    erledigt: todo.unteraufgaben.filter((s) => s.erledigt).length,
    gesamt: todo.unteraufgaben.length
  }
}

// --- Sortierung ---

/**
 * Offene zuerst, darin höchste Priorität oben, bei Gleichstand das ältere zuerst.
 * Erledigte stehen unten, in derselben Reihenfolge.
 */
export function sortTodos(todos: readonly Todo[]): Todo[] {
  return [...todos].sort(
    (a, b) =>
      Number(a.erledigt) - Number(b.erledigt) ||
      b.prioritaet - a.prioritaet ||
      a.erstelltAm.localeCompare(b.erstelltAm)
  )
}

// --- Hilfsfunktionen ---

function mapTodo(data: AppData, id: string, fn: (todo: Todo) => Todo): AppData {
  if (!data.todos.some((t) => t.id === id)) return data
  return { ...data, todos: data.todos.map((t) => (t.id === id ? fn(t) : t)) }
}

export function withoutDeadline(todo: Todo): Todo {
  const { deadlineId: _removed, ...rest } = todo
  return rest
}
