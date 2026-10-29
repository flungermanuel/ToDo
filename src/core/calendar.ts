import type { AppData, Deadline, IsoDate, Todo } from '@shared/types'
import { addDays, daysBetween } from './dates'
import { isDeadlineDone } from './links'
import { sortDeadlines } from './deadlines'
import { sortTodos } from './todos'

// Zeit-Logik für Tages-/Wochenansicht und Kalender. Woche = Montag bis Sonntag.
// Alles rechnet mit "YYYY-MM-DD"-Strings in UTC – so gibt es keine Zeitzonen-Fehler.

// --- Kalender-Grundlagen ---

/** 0 = Montag … 6 = Sonntag */
export function weekdayIndex(date: IsoDate): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
}

export function isWeekend(date: IsoDate): boolean {
  return weekdayIndex(date) >= 5
}

export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, -weekdayIndex(date))
}

/** Montag bis Sonntag der Woche, in der `date` liegt */
export function weekDays(date: IsoDate): IsoDate[] {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Kalenderwoche nach ISO 8601 (die Woche mit dem ersten Donnerstag des Jahres ist KW 1) */
export function isoWeek(date: IsoDate): number {
  const thursday = addDays(date, 3 - weekdayIndex(date))
  const jan1 = `${thursday.slice(0, 4)}-01-01`
  return Math.floor(daysBetween(jan1, thursday) / 7) + 1
}

/**
 * Raster für eine Monatsansicht: Wochen (Mo–So) als Zeilen, inklusive der Tage aus dem
 * Vor- und Folgemonat, die die erste und letzte Woche auffüllen. `month` = 1–12.
 */
export function monthGrid(year: number, month: number): IsoDate[][] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonthFirst =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
  const last = addDays(nextMonthFirst, -1)

  const weeks: IsoDate[][] = []
  for (let monday = startOfWeek(first); monday <= last; monday = addDays(monday, 7)) {
    weeks.push(weekDays(monday))
  }
  return weeks
}

// --- Todos und Tage ---

/** Eigenes Datum des Todos, sonst das Datum der verknüpften Deadline, sonst keins */
export function effectiveDate(data: AppData, todo: Todo): IsoDate | undefined {
  if (todo.datum) return todo.datum
  if (!todo.deadlineId) return undefined
  return data.deadlines.find((d) => d.id === todo.deadlineId)?.datum
}

export function todosForDay(data: AppData, day: IsoDate): Todo[] {
  return sortTodos(data.todos.filter((t) => effectiveDate(data, t) === day))
}

export function todosWithoutDate(data: AppData): Todo[] {
  return sortTodos(data.todos.filter((t) => effectiveDate(data, t) === undefined))
}

/** Offene Todos von Tagen vor `today` – ältester Tag zuerst */
export function overdueTodos(data: AppData, today: IsoDate): Todo[] {
  return sortTodos(
    data.todos.filter((t) => {
      const date = effectiveDate(data, t)
      return !t.erledigt && date !== undefined && date < today
    })
  ).sort((a, b) => effectiveDate(data, a)!.localeCompare(effectiveDate(data, b)!))
}

export function deadlinesForDay(data: AppData, day: IsoDate): Deadline[] {
  return sortDeadlines(data.deadlines.filter((d) => d.datum === day))
}

// --- Markierungen für das Kalender-Widget ---

export type DeadlineMarker = 'keine' | 'erledigt' | 'offen' | 'ueberfaellig'

export interface DayMarker {
  offeneTodos: number
  /** Wichtigster Zustand der Deadlines an diesem Tag (überfällig > offen > erledigt) */
  deadline: DeadlineMarker
}

export function calendarMarkers(
  data: AppData,
  days: readonly IsoDate[],
  today: IsoDate
): Map<IsoDate, DayMarker> {
  const markers = new Map<IsoDate, DayMarker>()
  for (const day of days) markers.set(day, { offeneTodos: 0, deadline: 'keine' })

  for (const todo of data.todos) {
    const date = effectiveDate(data, todo)
    const marker = date ? markers.get(date) : undefined
    if (marker && !todo.erledigt) marker.offeneTodos++
  }

  const rank: Record<DeadlineMarker, number> = { keine: 0, erledigt: 1, offen: 2, ueberfaellig: 3 }
  for (const deadline of data.deadlines) {
    const marker = markers.get(deadline.datum)
    if (!marker) continue
    const state: DeadlineMarker = isDeadlineDone(data, deadline)
      ? 'erledigt'
      : deadline.datum < today
        ? 'ueberfaellig'
        : 'offen'
    if (rank[state] > rank[marker.deadline]) marker.deadline = state
  }

  return markers
}
