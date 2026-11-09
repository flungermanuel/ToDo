import type { Subtask, Todo } from '@shared/types'
import type { Db } from '../db'

// Unteraufgaben liegen in einer eigenen Tabelle und zeigen per todo_id auf ihr Todo.
// In AppData stecken sie dagegen im Todo – die Umwandlung passiert hier.

interface SubtaskRow {
  id: string
  todo_id: string
  titel: string
  erledigt: number
}

/** Alle Unteraufgaben, gruppiert nach Todo, jeweils in ihrer Reihenfolge. */
export function selectAllByTodo(db: Db): Map<string, Subtask[]> {
  const rows = db
    .prepare('SELECT id, todo_id, titel, erledigt FROM subtasks ORDER BY todo_id, position')
    .all() as unknown as SubtaskRow[]
  const byTodo = new Map<string, Subtask[]>()
  for (const r of rows) {
    const list = byTodo.get(r.todo_id) ?? []
    list.push({ id: r.id, titel: r.titel, erledigt: r.erledigt === 1 })
    byTodo.set(r.todo_id, list)
  }
  return byTodo
}

export function insertAllOf(db: Db, todos: readonly Todo[]): void {
  const insert = db.prepare(
    'INSERT INTO subtasks (id, todo_id, titel, erledigt, position) VALUES (?, ?, ?, ?, ?)'
  )
  for (const todo of todos) {
    todo.unteraufgaben.forEach((s, position) =>
      insert.run(s.id, todo.id, s.titel, s.erledigt ? 1 : 0, position)
    )
  }
}
