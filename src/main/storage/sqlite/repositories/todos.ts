import type { Priority, Subtask, Todo } from '@shared/types'
import type { Db } from '../db'

// Todos. Optionale Felder (datum, deadlineId) sind in der Datenbank NULL und fehlen
// in AppData ganz – nicht undefined, damit gespeicherte und geladene Daten gleich sind.

interface TodoRow {
  id: string
  titel: string
  erledigt: number
  erstellt_am: string
  prioritaet: number
  category_id: string
  datum: string | null
  deadline_id: string | null
}

/** Alle Todos in ihrer Reihenfolge; die Unteraufgaben kommen fertig gruppiert dazu. */
export function selectAll(db: Db, subtasksByTodo: Map<string, Subtask[]>): Todo[] {
  const rows = db
    .prepare(
      `SELECT id, titel, erledigt, erstellt_am, prioritaet, category_id, datum, deadline_id
       FROM todos ORDER BY position`
    )
    .all() as unknown as TodoRow[]
  return rows.map((r) => {
    const todo: Todo = {
      id: r.id,
      titel: r.titel,
      erledigt: r.erledigt === 1,
      erstelltAm: r.erstellt_am,
      prioritaet: r.prioritaet as Priority,
      unteraufgaben: subtasksByTodo.get(r.id) ?? [],
      categoryId: r.category_id
    }
    if (r.datum !== null) todo.datum = r.datum
    if (r.deadline_id !== null) todo.deadlineId = r.deadline_id
    return todo
  })
}

export function insertAll(db: Db, todos: readonly Todo[]): void {
  const insert = db.prepare(
    `INSERT INTO todos
       (id, titel, erledigt, erstellt_am, prioritaet, category_id, datum, deadline_id, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  todos.forEach((t, position) =>
    insert.run(
      t.id,
      t.titel,
      t.erledigt ? 1 : 0,
      t.erstelltAm,
      t.prioritaet,
      t.categoryId,
      t.datum ?? null,
      t.deadlineId ?? null,
      position
    )
  )
}

/** Löscht alle Todos – ihre Unteraufgaben verschwinden per ON DELETE CASCADE mit. */
export function deleteAll(db: Db): void {
  db.exec('DELETE FROM todos')
}
