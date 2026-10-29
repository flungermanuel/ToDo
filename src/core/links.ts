import type { AppData, Deadline, Todo } from '@shared/types'
import { withoutDeadline } from './todos'

// Verknüpfung Todo → Deadline. Gespeichert wird sie nur am Todo (deadlineId).
// Regeln: optional, 1:1, wirkt nur in eine Richtung (Todo bestimmt den Status).

export function findLinkedTodo(data: AppData, deadlineId: string): Todo | undefined {
  return data.todos.find((t) => t.deadlineId === deadlineId)
}

/** Ist die Deadline erledigt? Mit verknüpftem Todo zählt dessen Status. */
export function isDeadlineDone(data: AppData, deadline: Deadline): boolean {
  const todo = findLinkedTodo(data, deadline.id)
  return todo ? todo.erledigt : deadline.erledigt
}

export function linkTodo(data: AppData, todoId: string, deadlineId: string): AppData {
  const todoExists = data.todos.some((t) => t.id === todoId)
  const deadlineExists = data.deadlines.some((d) => d.id === deadlineId)
  if (!todoExists || !deadlineExists) return data

  return {
    ...data,
    todos: data.todos.map((t) => {
      if (t.id === todoId) return { ...t, deadlineId }
      // 1:1 – falls ein anderes Todo diese Deadline hatte, verliert es sie
      if (t.deadlineId === deadlineId) return withoutDeadline(t)
      return t
    })
  }
}

export function unlinkTodo(data: AppData, todoId: string): AppData {
  const todo = data.todos.find((t) => t.id === todoId)
  if (!todo?.deadlineId) return data
  const deadlineId = todo.deadlineId

  return {
    ...data,
    todos: data.todos.map((t) => (t.id === todoId ? withoutDeadline(t) : t)),
    // Den aktuellen Status übernehmen, damit die Deadline beim Lösen nicht "umspringt"
    deadlines: data.deadlines.map((d) =>
      d.id === deadlineId ? { ...d, erledigt: todo.erledigt } : d
    )
  }
}
