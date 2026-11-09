import type { SQLInputValue } from 'node:sqlite'

/** Eine Tabellenzeile als Liste der Spaltenwerte. Der erste Wert ist immer die id. */
export type Row = readonly SQLInputValue[]

/** Was zuletzt in einer Tabelle gespeichert wurde: id → Zeile als Text (zum Vergleichen). */
export type TableState = ReadonlyMap<string, string>

export interface RowDiff {
  /** Neue oder geänderte Zeilen – werden per Upsert geschrieben */
  changed: Row[]
  /** ids, die es nicht mehr gibt – werden gelöscht */
  removed: string[]
  /** Stand nach dem Speichern */
  next: TableState
}

/**
 * Vergleicht die Zeilen eines Datenstands mit dem, was zuletzt gespeichert wurde.
 * Eine Zeile gilt als geändert, sobald sich irgendein Wert unterscheidet – auch die
 * Position in der Liste.
 */
export function diffRows(previous: TableState, rows: readonly Row[]): RowDiff {
  const next = new Map<string, string>()
  const changed: Row[] = []
  for (const row of rows) {
    const id = String(row[0])
    const key = JSON.stringify(row)
    next.set(id, key)
    if (previous.get(id) !== key) changed.push(row)
  }
  const removed = [...previous.keys()].filter((id) => !next.has(id))
  return { changed, removed, next }
}
