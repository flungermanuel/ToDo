import type { AppData, Deadline, Todo } from '@shared/types'
import { withoutDeadline } from './todos'

// Rückgängig machen von Löschungen. Bewusst wird nicht der alte Gesamtzustand
// zurückgeholt – sonst gingen Änderungen verloren, die man seit dem Löschen gemacht hat.
// Stattdessen kommt genau das gelöschte Element an seinen alten Platz zurück.
// Was inzwischen nicht mehr passt (Kategorie gelöscht, Deadline vergeben), wird angepasst.

/** Alles, was nötig ist, um ein gelöschtes Todo wiederherzustellen */
export interface DeletedTodo {
  todo: Todo
  /** Position in data.todos vor dem Löschen */
  index: number
}

export interface DeletedDeadline {
  deadline: Deadline
  index: number
  /** Todo, das vor dem Löschen mit der Deadline verknüpft war */
  linkedTodoId?: string
}

/** Merkt sich ein Todo vor dem Löschen. `undefined`, wenn es die ID nicht gibt. */
export function snapshotTodo(data: AppData, id: string): DeletedTodo | undefined {
  const index = data.todos.findIndex((t) => t.id === id)
  return index < 0 ? undefined : { todo: data.todos[index]!, index }
}

export function snapshotDeadline(data: AppData, id: string): DeletedDeadline | undefined {
  const index = data.deadlines.findIndex((d) => d.id === id)
  if (index < 0) return undefined
  const linkedTodoId = data.todos.find((t) => t.deadlineId === id)?.id
  return { deadline: data.deadlines[index]!, index, linkedTodoId }
}

export function restoreTodo(data: AppData, { todo, index }: DeletedTodo): AppData {
  if (data.todos.some((t) => t.id === todo.id)) return data

  let restored = todo
  // Kategorie inzwischen gelöscht → erste Kategorie (wie beim Anlegen)
  if (!data.categories.some((c) => c.id === restored.categoryId)) {
    const fallback = data.categories[0]
    if (!fallback) return data
    restored = { ...restored, categoryId: fallback.id }
  }
  // Deadline weg oder inzwischen mit einem anderen Todo verknüpft → Verknüpfung fällt weg (1:1)
  const deadlineId = restored.deadlineId
  if (
    deadlineId !== undefined &&
    (!data.deadlines.some((d) => d.id === deadlineId) ||
      data.todos.some((t) => t.deadlineId === deadlineId))
  ) {
    restored = withoutDeadline(restored)
  }

  return { ...data, todos: insertAt(data.todos, index, restored) }
}

export function restoreDeadline(
  data: AppData,
  { deadline, index, linkedTodoId }: DeletedDeadline
): AppData {
  if (data.deadlines.some((d) => d.id === deadline.id)) return data

  // Verknüpfung nur wiederherstellen, wenn das Todo noch da und frei ist
  const relink = (t: Todo) => t.id === linkedTodoId && t.deadlineId === undefined
  return {
    ...data,
    deadlines: insertAt(data.deadlines, index, deadline),
    todos: data.todos.map((t) => (relink(t) ? { ...t, deadlineId: deadline.id } : t))
  }
}

function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const at = Math.min(Math.max(index, 0), list.length)
  return [...list.slice(0, at), item, ...list.slice(at)]
}
