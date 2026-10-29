import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import {
  calendarMarkers,
  deadlinesForDay,
  effectiveDate,
  isoWeek,
  isWeekend,
  monthGrid,
  overdueTodos,
  startOfWeek,
  todosForDay,
  todosWithoutDate,
  weekDays,
  weekdayIndex
} from '../calendar'
import { createDeadline, toggleDeadline } from '../deadlines'
import { createTodo, setTodoDate, toggleTodo } from '../todos'
import { testContext } from './helpers'

// Donnerstag, KW 44
const TODAY = '2026-10-29'

describe('Woche', () => {
  it('Wochentag, Wochenende, Wochenstart (Montag)', () => {
    expect(weekdayIndex(TODAY)).toBe(3)
    expect(weekdayIndex('2026-11-01')).toBe(6)
    expect(isWeekend('2026-10-31')).toBe(true)
    expect(isWeekend('2026-10-30')).toBe(false)
    expect(startOfWeek(TODAY)).toBe('2026-10-26')
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26')
  })

  it('weekDays liefert Montag bis Sonntag, auch über Monatsgrenzen', () => {
    expect(weekDays(TODAY)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01'
    ])
  })

  it('isoWeek nach ISO 8601, inklusive Jahreswechsel', () => {
    expect(isoWeek(TODAY)).toBe(44)
    expect(isoWeek('2026-01-01')).toBe(1)
    // 2026 beginnt an einem Donnerstag → hat 53 Wochen
    expect(isoWeek('2026-12-31')).toBe(53)
    expect(isoWeek('2027-01-03')).toBe(53)
    expect(isoWeek('2027-01-04')).toBe(1)
  })
})

describe('monthGrid', () => {
  it('Oktober 2026: 5 Wochen von Mo 28. Sep. bis So 1. Nov.', () => {
    const grid = monthGrid(2026, 10)
    expect(grid).toHaveLength(5)
    expect(grid[0]![0]).toBe('2026-09-28')
    expect(grid[4]![6]).toBe('2026-11-01')
    expect(grid.every((w) => w.length === 7)).toBe(true)
  })

  it('Dezember → Jahreswechsel, Februar 2027 genau 4 Wochen', () => {
    expect(monthGrid(2026, 12).at(-1)!.at(-1)).toBe('2027-01-03')
    expect(monthGrid(2027, 2)).toHaveLength(4)
  })
})

/** Deadline am 5.11., Todos: mit Datum, verknüpft ohne Datum, ohne alles, überfällig */
function setup(): AppData {
  const ctx = testContext()
  let data = createDeadline(emptyAppData(), { titel: 'Abgabe', datum: '2026-11-05' }, ctx)
  data = createTodo(data, { titel: 'Heute', datum: TODAY }, ctx)
  data = createTodo(data, { titel: 'An Deadline', deadlineId: 'id-1' }, ctx)
  data = createTodo(data, { titel: 'Eigenes Datum trotz Deadline', datum: '2026-10-30' }, ctx)
  data = createTodo(data, { titel: 'Ohne Datum' }, ctx)
  data = createTodo(data, { titel: 'Überfällig alt', datum: '2026-10-20' }, ctx)
  data = createTodo(data, { titel: 'Überfällig neu', datum: '2026-10-27' }, ctx)
  data = createTodo(data, { titel: 'Erledigt gestern', datum: '2026-10-28' }, ctx)
  return toggleTodo(data, data.todos[6]!.id)
}

describe('Todos und Tage', () => {
  it('effectiveDate: eigenes Datum vor Deadline-Datum', () => {
    const ctx = testContext('2026-10-29T12:00:00.000Z')
    let data = setup()
    expect(effectiveDate(data, data.todos[1]!)).toBe('2026-11-05')
    data = createTodo(data, { titel: 'X', datum: '2026-10-31', deadlineId: 'id-1' }, ctx)
    expect(effectiveDate(data, data.todos.at(-1)!)).toBe('2026-10-31')
    expect(effectiveDate(data, data.todos[3]!)).toBeUndefined()
  })

  it('todosForDay, todosWithoutDate', () => {
    const data = setup()
    expect(todosForDay(data, TODAY).map((t) => t.titel)).toEqual(['Heute'])
    expect(todosForDay(data, '2026-11-05').map((t) => t.titel)).toEqual(['An Deadline'])
    expect(todosWithoutDate(data).map((t) => t.titel)).toEqual(['Ohne Datum'])
  })

  it('overdueTodos: nur offene vor heute, ältester Tag zuerst', () => {
    expect(overdueTodos(setup(), TODAY).map((t) => t.titel)).toEqual([
      'Überfällig alt',
      'Überfällig neu'
    ])
  })

  it('setTodoDate setzt, entfernt und ignoriert ungültige Daten', () => {
    const data = setup()
    const id = data.todos[3]!.id
    const dated = setTodoDate(data, id, '2026-11-02')
    expect(dated.todos[3]!.datum).toBe('2026-11-02')
    expect(setTodoDate(dated, id, 'kaputt')).toBe(dated)
    expect('datum' in setTodoDate(dated, id, undefined).todos[3]!).toBe(false)
  })

  it('deadlinesForDay', () => {
    expect(deadlinesForDay(setup(), '2026-11-05').map((d) => d.titel)).toEqual(['Abgabe'])
    expect(deadlinesForDay(setup(), TODAY)).toEqual([])
  })
})

describe('calendarMarkers', () => {
  it('zählt offene Todos und markiert Deadlines', () => {
    const data = setup()
    const days = ['2026-10-27', '2026-10-28', TODAY, '2026-11-05', '2026-11-06']
    const m = calendarMarkers(data, days, TODAY)
    expect(m.get(TODAY)).toEqual({ offeneTodos: 1, deadline: 'keine' })
    // erledigte Todos zählen nicht
    expect(m.get('2026-10-28')).toEqual({ offeneTodos: 0, deadline: 'keine' })
    expect(m.get('2026-11-05')).toEqual({ offeneTodos: 1, deadline: 'offen' })
  })

  it('Deadline-Zustand: überfällig > offen > erledigt', () => {
    const ctx = testContext()
    let data = createDeadline(emptyAppData(), { titel: 'A', datum: '2026-10-20' }, ctx)
    data = createDeadline(data, { titel: 'B', datum: '2026-10-20' }, ctx)
    data = toggleDeadline(data, 'id-1')
    expect(calendarMarkers(data, ['2026-10-20'], TODAY).get('2026-10-20')!.deadline).toBe(
      'ueberfaellig'
    )
    data = toggleDeadline(data, 'id-2')
    expect(calendarMarkers(data, ['2026-10-20'], TODAY).get('2026-10-20')!.deadline).toBe(
      'erledigt'
    )
  })
})
