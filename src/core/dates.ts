import type { IsoDate } from '@shared/types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Lokaler Kalendertag eines Date-Objekts als "YYYY-MM-DD". */
export function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Prüft Format und ob der Tag existiert (z. B. kein 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/**
 * Tage von `from` bis `to` (positiv = `to` liegt in der Zukunft).
 * Rechnet in UTC, damit Sommer-/Winterzeit keinen Tag "verschluckt".
 */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY)
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(toUtcMs(date) + days * MS_PER_DAY)
  return d.toISOString().slice(0, 10)
}

function toUtcMs(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d)
}
