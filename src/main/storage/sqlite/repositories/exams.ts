import type { Exam } from '@shared/types'
import type { Db } from '../db'
import type { Row } from '../diff'

interface ExamRow {
  id: string
  titel: string
  datum: string
}

export function selectAll(db: Db): Exam[] {
  const rows = db
    .prepare('SELECT id, titel, datum FROM exams ORDER BY position')
    .all() as unknown as ExamRow[]
  return rows.map((r) => ({ id: r.id, titel: r.titel, datum: r.datum }))
}

/** Spaltenwerte in der Reihenfolge von upsert() */
export function rows(exams: readonly Exam[]): Row[] {
  return exams.map((e, position) => [e.id, e.titel, e.datum, position])
}

export function upsert(db: Db, rows: readonly Row[]): void {
  const statement = db.prepare(
    `INSERT INTO exams (id, titel, datum, position) VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       titel = excluded.titel, datum = excluded.datum, position = excluded.position`
  )
  for (const row of rows) statement.run(...row)
}

export function deleteIds(db: Db, ids: readonly string[]): void {
  const statement = db.prepare('DELETE FROM exams WHERE id = ?')
  for (const id of ids) statement.run(id)
}

export function deleteAll(db: Db): void {
  db.exec('DELETE FROM exams')
}
