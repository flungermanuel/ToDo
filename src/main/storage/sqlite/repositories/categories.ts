import type { Category, CategoryColor } from '@shared/types'
import type { Db } from '../db'
import type { Row } from '../diff'

// Kategorien – Reihenfolge der Liste = Reihenfolge der Anzeige (Spalte position).

interface CategoryRow {
  id: string
  name: string
  farbe: string
}

export function selectAll(db: Db): Category[] {
  const rows = db
    .prepare('SELECT id, name, farbe FROM categories ORDER BY position')
    .all() as unknown as CategoryRow[]
  return rows.map((r) => ({ id: r.id, name: r.name, farbe: r.farbe as CategoryColor }))
}

export function count(db: Db): number {
  const row = db.prepare('SELECT count(*) AS n FROM categories').get() as { n: number }
  return row.n
}

/** Spaltenwerte in der Reihenfolge von upsert() */
export function rows(categories: readonly Category[]): Row[] {
  return categories.map((c, position) => [c.id, c.name, c.farbe, position])
}

/** Fügt neue Zeilen ein und aktualisiert bestehende (gleiche id) */
export function upsert(db: Db, rows: readonly Row[]): void {
  const statement = db.prepare(
    `INSERT INTO categories (id, name, farbe, position) VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       name = excluded.name, farbe = excluded.farbe, position = excluded.position`
  )
  for (const row of rows) statement.run(...row)
}

export function deleteIds(db: Db, ids: readonly string[]): void {
  const statement = db.prepare('DELETE FROM categories WHERE id = ?')
  for (const id of ids) statement.run(id)
}

export function deleteAll(db: Db): void {
  db.exec('DELETE FROM categories')
}
