import type { Exam } from '@shared/types'
import type { Db } from '../db'

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

export function insertAll(db: Db, exams: readonly Exam[]): void {
  const insert = db.prepare('INSERT INTO exams (id, titel, datum, position) VALUES (?, ?, ?, ?)')
  exams.forEach((e, position) => insert.run(e.id, e.titel, e.datum, position))
}

export function deleteAll(db: Db): void {
  db.exec('DELETE FROM exams')
}
