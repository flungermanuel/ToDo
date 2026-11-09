import type { Subtask, Todo } from '@shared/types'
import type { Db } from '../db'
import type { Row } from '../diff'

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

/** Spaltenwerte aller Unteraufgaben (Position = innerhalb ihres Todos) */
export function rows(todos: readonly Todo[]): Row[] {
  return todos.flatMap((todo) =>
    todo.unteraufgaben.map((s, position) => [s.id, todo.id, s.titel, s.erledigt ? 1 : 0, position])
  )
}

export function upsert(db: Db, rows: readonly Row[]): void {
  const statement = db.prepare(
    `INSERT INTO subtasks (id, todo_id, titel, erledigt, position) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       todo_id = excluded.todo_id, titel = excluded.titel, erledigt = excluded.erledigt,
       position = excluded.position`
  )
  for (const row of rows) statement.run(...row)
}

export function deleteIds(db: Db, ids: readonly string[]): void {
  const statement = db.prepare('DELETE FROM subtasks WHERE id = ?')
  for (const id of ids) statement.run(id)
}
