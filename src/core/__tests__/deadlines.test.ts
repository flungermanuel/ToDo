import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import {
  canToggleDeadline,
  createDeadline,
  deadlineViews,
  deleteDeadline,
  describeDeadline,
  sortDeadlines,
  toggleDeadline,
  updateDeadline
} from '../deadlines'
import { createTodo, toggleTodo } from '../todos'
import { isDeadlineDone, linkTodo, unlinkTodo } from '../links'
import { testContext } from './helpers'

const TODAY = '2026-10-29'

function setup(): { data: AppData; todoId: string; deadlineId: string } {
  const ctx = testContext()
  let data = createDeadline(emptyAppData(), { titel: 'Abgabe Mathe', datum: '2026-11-05' }, ctx)
  data = createTodo(data, { titel: 'Mathe-Blatt rechnen' }, ctx)
  return { data, deadlineId: data.deadlines[0]!.id, todoId: data.todos[0]!.id }
}

describe('createDeadline / updateDeadline / deleteDeadline', () => {
  it('legt an und lehnt ungültige Daten ab', () => {
    const data = emptyAppData()
    expect(createDeadline(data, { titel: 'X', datum: '2026-02-30' })).toBe(data)
    expect(createDeadline(data, { titel: ' ', datum: TODAY })).toBe(data)
    const created = createDeadline(data, { titel: 'Steuer', datum: TODAY }, testContext())
    expect(created.deadlines[0]).toEqual({
      id: 'id-1',
      titel: 'Steuer',
      datum: TODAY,
      erledigt: false,
      prioritaet: 3
    })
  })

  it('ändert nur gültige Felder', () => {
    const { data, deadlineId } = setup()
    const updated = updateDeadline(data, deadlineId, { datum: 'kaputt', titel: 'Abgabe Analysis' })
    expect(updated.deadlines[0]).toMatchObject({ datum: '2026-11-05', titel: 'Abgabe Analysis' })
  })

  it('beim Löschen bleibt das verknüpfte Todo, verliert aber den Verweis', () => {
    const { data, todoId, deadlineId } = setup()
    const linked = linkTodo(data, todoId, deadlineId)
    const deleted = deleteDeadline(linked, deadlineId)
    expect(deleted.deadlines).toHaveLength(0)
    expect(deleted.todos[0]!.deadlineId).toBeUndefined()
  })
})

describe('Verknüpfung Todo → Deadline', () => {
  it('Todo abhaken markiert die Deadline als erledigt', () => {
    const { data, todoId, deadlineId } = setup()
    const done = toggleTodo(linkTodo(data, todoId, deadlineId), todoId)
    expect(isDeadlineDone(done, done.deadlines[0]!)).toBe(true)
  })

  it('verknüpfte Deadline lässt sich nicht direkt abhaken (nur eine Richtung)', () => {
    const { data, todoId, deadlineId } = setup()
    const linked = linkTodo(data, todoId, deadlineId)
    expect(canToggleDeadline(linked, deadlineId)).toBe(false)
    expect(toggleDeadline(linked, deadlineId)).toBe(linked)
  })

  it('Deadline ohne Todo wird direkt abgehakt', () => {
    const { data, deadlineId } = setup()
    const done = toggleDeadline(data, deadlineId)
    expect(isDeadlineDone(done, done.deadlines[0]!)).toBe(true)
  })

  it('ist 1:1 – ein zweites Todo übernimmt die Deadline', () => {
    const ctx = testContext('2026-10-29T09:00:00.000Z')
    const { data, todoId, deadlineId } = setup()
    let next = linkTodo(data, todoId, deadlineId)
    next = createTodo(next, { titel: 'Zweites' }, ctx)
    const secondId = next.todos[1]!.id
    next = linkTodo(next, secondId, deadlineId)
    expect(next.todos[0]!.deadlineId).toBeUndefined()
    expect(next.todos[1]!.deadlineId).toBe(deadlineId)
  })

  it('beim Lösen übernimmt die Deadline den aktuellen Status', () => {
    const { data, todoId, deadlineId } = setup()
    let next = toggleTodo(linkTodo(data, todoId, deadlineId), todoId)
    next = unlinkTodo(next, todoId)
    expect(next.todos[0]!.deadlineId).toBeUndefined()
    expect(next.deadlines[0]!.erledigt).toBe(true)
  })
})

describe('describeDeadline', () => {
  it('berechnet Tage bis Fälligkeit und Überfällig', () => {
    const { data } = setup()
    const d = data.deadlines[0]!
    expect(describeDeadline(data, d, TODAY)).toMatchObject({ tageBis: 7, ueberfaellig: false })
    expect(describeDeadline(data, d, '2026-11-05')).toMatchObject({
      tageBis: 0,
      ueberfaellig: false
    })
    expect(describeDeadline(data, d, '2026-11-06')).toMatchObject({
      tageBis: -1,
      ueberfaellig: true
    })
  })

  it('erledigte Deadlines sind nie überfällig, bleiben aber in der Liste', () => {
    const { data, deadlineId } = setup()
    const done = toggleDeadline(data, deadlineId)
    const views = deadlineViews(done, '2026-12-01')
    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({ erledigt: true, ueberfaellig: false })
  })

  it('zeigt das verknüpfte Todo an', () => {
    const { data, todoId, deadlineId } = setup()
    const view = describeDeadline(linkTodo(data, todoId, deadlineId), data.deadlines[0]!, TODAY)
    expect(view.verknuepftesTodoId).toBe(todoId)
  })
})

describe('sortDeadlines', () => {
  it('nach Datum, dann Priorität absteigend, dann Titel', () => {
    const ctx = testContext()
    let data = emptyAppData()
    data = createDeadline(data, { titel: 'später', datum: '2026-12-01' }, ctx)
    data = createDeadline(data, { titel: 'Beta', datum: '2026-11-01' }, ctx)
    data = createDeadline(data, { titel: 'Alpha', datum: '2026-11-01' }, ctx)
    data = createDeadline(data, { titel: 'Wichtig', datum: '2026-11-01', prioritaet: 5 }, ctx)
    expect(sortDeadlines(data.deadlines).map((d) => d.titel)).toEqual([
      'Wichtig',
      'Alpha',
      'Beta',
      'später'
    ])
  })
})
