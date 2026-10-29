import { useEffect, useState } from 'react'
import { daysBetween, toIsoDate } from '@core/index'
import type { IsoDate } from '@shared/types'

// Datums-Anzeige auf Deutsch – Präsentation, deshalb im Renderer.

/** "in 3 Tagen", "Morgen", "Heute", "Gestern", "vor 4 Tagen" */
export function relativeDays(tageBis: number): string {
  if (tageBis === 0) return 'Heute'
  if (tageBis === 1) return 'Morgen'
  if (tageBis === -1) return 'Gestern'
  return tageBis > 0 ? `in ${tageBis} Tagen` : `vor ${-tageBis} Tagen`
}

/** "Heute", "Morgen", "Gestern", sonst "Do., 5. Nov." */
export function dayLabel(date: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, date)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  if (diff === -1) return 'Gestern'
  return formatShortDate(date)
}

const shortFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
})

/** "Do., 5. Nov." */
export function formatShortDate(date: IsoDate): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return shortFormat.format(new Date(y, m - 1, d))
}

/**
 * Das heutige Datum – aktualisiert sich, wenn die App über Mitternacht offen ist
 * oder das Fenster wieder in den Vordergrund kommt.
 */
export function useToday(): IsoDate {
  const [today, setToday] = useState(() => toIsoDate(new Date()))

  useEffect(() => {
    const refresh = () => setToday(toIsoDate(new Date()))
    const timer = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return today
}
