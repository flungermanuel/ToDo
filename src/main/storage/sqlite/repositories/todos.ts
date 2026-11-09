import type { Priority, Subtask, Todo } from '@shared/types'
import type { Db } from '../db'
import type { Row } from '../diff'

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

/** Spaltenwerte in der Reihenfolge von upsert() – ohne Unteraufgaben (eigene Tabelle) */
export function rows(todos: readonly Todo[]): Row[] {
  return todos.map((t, position) => [
    t.id,
    t.titel,
    t.erledigt ? 1 : 0,
    t.erstelltAm,
    t.prioritaet,
    t.categoryId,
    t.datum ?? null,
    t.deadlineId ?? null,
    position
  ])
}

export function upsert(db: Db, rows: readonly Row[]): void {
  // UNIQUE auf deadline_id wird nach jeder einzelnen Anweisung geprüft. Wandert eine
  // Deadline in einem Speichervorgang von Todo A zu Todo B, hätte B sie kurz, während A
  // sie noch hat. Deshalb bei allen geänderten Todos die Verknüpfung zuerst lösen.
  const unlink = db.prepare('UPDATE todos SET deadline_id = NULL WHERE id = ?')
  for (const row of rows) unlink.run(row[0]!)

  const statement = db.prepare(
    `INSERT INTO todos
       (id, titel, erledigt, erstellt_am, prioritaet, category_id, datum, deadline_id, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       titel = excluded.titel, erledigt = excluded.erledigt, erstellt_am = excluded.erstellt_am,
       prioritaet = excluded.prioritaet, category_id = excluded.category_id,
       datum = excluded.datum, deadline_id = excluded.deadline_id, position = excluded.position`
  )
  for (const row of rows) statement.run(...row)
}

/** Löscht Todos – ihre Unteraufgaben verschwinden per ON DELETE CASCADE mit. */
export function deleteIds(db: Db, ids: readonly string[]): void {
  const statement = db.prepare('DELETE FROM todos WHERE id = ?')
  for (const id of ids) statement.run(id)
}

/** Löscht alle Todos – ihre Unteraufgaben verschwinden per ON DELETE CASCADE mit. */
export function deleteAll(db: Db): void {
  db.exec('DELETE FROM todos')
}
