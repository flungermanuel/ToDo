import type { Deadline, Priority } from '@shared/types'
import type { Db } from '../db'
import type { Row } from '../diff'

interface DeadlineRow {
  id: string
  titel: string
  datum: string
  erledigt: number
  prioritaet: number
}

export function selectAll(db: Db): Deadline[] {
  const rows = db
    .prepare('SELECT id, titel, datum, erledigt, prioritaet FROM deadlines ORDER BY position')
    .all() as unknown as DeadlineRow[]
  return rows.map((r) => ({
    id: r.id,
    titel: r.titel,
    datum: r.datum,
    erledigt: r.erledigt === 1,
    prioritaet: r.prioritaet as Priority
  }))
}

/** Spaltenwerte in der Reihenfolge von upsert() */
export function rows(deadlines: readonly Deadline[]): Row[] {
  return deadlines.map((d, position) => [
    d.id,
    d.titel,
    d.datum,
    d.erledigt ? 1 : 0,
    d.prioritaet,
    position
  ])
}

export function upsert(db: Db, rows: readonly Row[]): void {
  const statement = db.prepare(
    `INSERT INTO deadlines (id, titel, datum, erledigt, prioritaet, position)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       titel = excluded.titel, datum = excluded.datum, erledigt = excluded.erledigt,
       prioritaet = excluded.prioritaet, position = excluded.position`
  )
  for (const row of rows) statement.run(...row)
}

export function deleteIds(db: Db, ids: readonly string[]): void {
  const statement = db.prepare('DELETE FROM deadlines WHERE id = ?')
  for (const id of ids) statement.run(id)
}

export function deleteAll(db: Db): void {
  db.exec('DELETE FROM deadlines')
}
