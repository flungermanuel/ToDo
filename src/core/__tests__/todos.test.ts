import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import {
  addSubtask,
  createTodo,
  deleteSubtask,
  deleteTodo,
  renameSubtask,
  sortTodos,
  subtaskProgress,
  toggleSubtask,
  toggleTodo,
  updateTodo
} from '../todos'
import { createDeadline } from '../deadlines'
import { testContext } from './helpers'

function withTodo(titel = 'Einkaufen'): { data: AppData; id: string } {
  const data = createTodo(emptyAppData(), { titel }, testContext())
  return { data, id: data.todos[0]!.id }
}

describe('createTodo', () => {
  it('legt ein offenes Todo mit Standard-Priorität 3 an', () => {
    const data = createTodo(emptyAppData(), { titel: '  Gym  ' }, testContext())
    expect(data.todos).toEqual([
      {
        id: 'id-1',
        titel: 'Gym',
        erledigt: false,
        erstelltAm: '2026-10-29T08:00:01.000Z',
        prioritaet: 3,
        unteraufgaben: []
      }
    ])
  })

  it('ignoriert leere Titel', () => {
    const data = emptyAppData()
    expect(createTodo(data, { titel: '   ' })).toBe(data)
  })

  it('verändert die Eingabedaten nicht', () => {
    const data = emptyAppData()
    createTodo(data, { titel: 'Test' })
    expect(data.todos).toHaveLength(0)
  })

  it('verknüpft nur mit existierenden Deadlines', () => {
    const ctx = testContext()
    let data = createDeadline(emptyAppData(), { titel: 'Abgabe', datum: '2026-11-05' }, ctx)
    data = createTodo(data, { titel: 'A', deadlineId: 'id-1' }, ctx)
    data = createTodo(data, { titel: 'B', deadlineId: 'gibt-es-nicht' }, ctx)
    expect(data.todos[0]!.deadlineId).toBe('id-1')
    expect(data.todos[1]!.deadlineId).toBeUndefined()
  })
})

describe('updateTodo / toggleTodo / deleteTodo', () => {
  it('ändert Titel und Priorität, leerer Titel bleibt unverändert', () => {
    const { data, id } = withTodo()
    const updated = updateTodo(data, id, { titel: 'Milch kaufen', prioritaet: 5 })
    expect(updated.todos[0]).toMatchObject({ titel: 'Milch kaufen', prioritaet: 5 })
    expect(updateTodo(updated, id, { titel: '' }).todos[0]!.titel).toBe('Milch kaufen')
  })

  it('hakt ab und wieder auf', () => {
    const { data, id } = withTodo()
    const done = toggleTodo(data, id)
    expect(done.todos[0]!.erledigt).toBe(true)
    expect(toggleTodo(done, id).todos[0]!.erledigt).toBe(false)
  })

  it('löscht und ignoriert unbekannte IDs', () => {
    const { data, id } = withTodo()
    expect(toggleTodo(data, 'x')).toBe(data)
    expect(deleteTodo(data, id).todos).toHaveLength(0)
  })
})

describe('Unteraufgaben', () => {
  it('hinzufügen, abhaken, umbenennen, löschen', () => {
    const ctx = testContext()
    let data = createTodo(emptyAppData(), { titel: 'Umzug' }, ctx)
    const todoId = data.todos[0]!.id
    data = addSubtask(data, todoId, 'Kartons', ctx)
    data = addSubtask(data, todoId, 'Transporter', ctx)
    data = addSubtask(data, todoId, '  ', ctx)
    const [first, second] = data.todos[0]!.unteraufgaben
    expect(data.todos[0]!.unteraufgaben).toHaveLength(2)

    data = toggleSubtask(data, todoId, first!.id)
    data = renameSubtask(data, todoId, second!.id, 'Transporter mieten')
    expect(subtaskProgress(data.todos[0]!)).toEqual({ erledigt: 1, gesamt: 2 })
    expect(data.todos[0]!.unteraufgaben[1]!.titel).toBe('Transporter mieten')

    data = deleteSubtask(data, todoId, first!.id)
    expect(data.todos[0]!.unteraufgaben.map((s) => s.titel)).toEqual(['Transporter mieten'])
  })

  it('hakt das Todo nicht automatisch ab, wenn alle Unteraufgaben erledigt sind', () => {
    const ctx = testContext()
    let data = createTodo(emptyAppData(), { titel: 'Umzug' }, ctx)
    const todoId = data.todos[0]!.id
    data = addSubtask(data, todoId, 'Kartons', ctx)
    data = toggleSubtask(data, todoId, data.todos[0]!.unteraufgaben[0]!.id)
    expect(data.todos[0]!.erledigt).toBe(false)
  })
})

describe('sortTodos', () => {
  it('offene vor erledigten, dann Priorität absteigend, dann älteste zuerst', () => {
    const ctx = testContext()
    let data = emptyAppData()
    data = createTodo(data, { titel: 'alt, prio 3' }, ctx)
    data = createTodo(data, { titel: 'prio 5', prioritaet: 5 }, ctx)
    data = createTodo(data, { titel: 'neu, prio 3' }, ctx)
    data = createTodo(data, { titel: 'erledigt, prio 5', prioritaet: 5 }, ctx)
    data = toggleTodo(data, data.todos[3]!.id)

    expect(sortTodos(data.todos).map((t) => t.titel)).toEqual([
      'prio 5',
      'alt, prio 3',
      'neu, prio 3',
      'erledigt, prio 5'
    ])
  })
})
