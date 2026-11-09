import type { Category, CategoryColor } from '@shared/types'
import type { Db } from '../db'

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

export function insertAll(db: Db, categories: readonly Category[]): void {
  const insert = db.prepare(
    'INSERT INTO categories (id, name, farbe, position) VALUES (?, ?, ?, ?)'
  )
  categories.forEach((c, position) => insert.run(c.id, c.name, c.farbe, position))
}

export function deleteAll(db: Db): void {
  db.exec('DELETE FROM categories')
}
