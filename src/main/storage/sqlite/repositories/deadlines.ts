import type { Deadline, Priority } from '@shared/types'
import type { Db } from '../db'

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

export function insertAll(db: Db, deadlines: readonly Deadline[]): void {
  const insert = db.prepare(
    `INSERT INTO deadlines (id, titel, datum, erledigt, prioritaet, position)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  deadlines.forEach((d, position) =>
    insert.run(d.id, d.titel, d.datum, d.erledigt ? 1 : 0, d.prioritaet, position)
  )
}

export function deleteAll(db: Db): void {
  db.exec('DELETE FROM deadlines')
}
