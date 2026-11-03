import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import { createTodo, deleteTodo, toggleTodo } from '../todos'
import { createDeadline, deleteDeadline } from '../deadlines'
import { deleteCategory } from '../categories'
import { linkTodo } from '../links'
import { restoreDeadline, restoreTodo, snapshotDeadline, snapshotTodo } from '../restore'
import { testContext } from './helpers'

const TODAY = '2026-10-29'

// Drei Todos A, B, C (Studium) und eine Deadline, verknüpft mit B
function setup(): AppData {
  const ctx = testContext()
  let data = emptyAppData()
  for (const titel of ['A', 'B', 'C']) data = createTodo(data, { titel }, ctx)
  data = createDeadline(data, { titel: 'Abgabe', datum: TODAY }, ctx)
  return linkTodo(data, 'id-2', 'id-4')
}

describe('restoreTodo', () => {
  it('stellt ein gelöschtes Todo an seiner alten Position wieder her', () => {
    const data = setup()
    const deleted = snapshotTodo(data, 'id-2')!
    const restored = restoreTodo(deleteTodo(data, 'id-2'), deleted)
    expect(restored.todos).toEqual(data.todos)
  })

  it('behält spätere Änderungen an anderen Todos', () => {
    const data = setup()
    const deleted = snapshotTodo(data, 'id-1')!
    const changed = toggleTodo(deleteTodo(data, 'id-1'), 'id-3')
    const restored = restoreTodo(changed, deleted)
    expect(restored.todos.map((t) => t.titel)).toEqual(['A', 'B', 'C'])
    expect(restored.todos[2]!.erledigt).toBe(true)
  })

  it('verschiebt in die erste Kategorie, wenn die eigene inzwischen gelöscht ist', () => {
    const ctx = testContext()
    let data = createTodo(emptyAppData(), { titel: 'X', categoryId: 'cat-persoenlich' }, ctx)
    const deleted = snapshotTodo(data, 'id-1')!
    data = deleteCategory(deleteTodo(data, 'id-1'), 'cat-persoenlich', { art: 'todosLoeschen' })
    expect(restoreTodo(data, deleted).todos[0]!.categoryId).toBe('cat-studium')
  })

  it('lässt die Verknüpfung weg, wenn die Deadline weg oder vergeben ist', () => {
    const data = setup()
    const deleted = snapshotTodo(data, 'id-2')!
    const withoutB = deleteTodo(data, 'id-2')

    const deadlineGone = restoreTodo(deleteDeadline(withoutB, 'id-4'), deleted)
    expect(deadlineGone.todos[1]!.deadlineId).toBeUndefined()

    const takenByA = restoreTodo(linkTodo(withoutB, 'id-1', 'id-4'), deleted)
    expect(takenByA.todos[1]!.deadlineId).toBeUndefined()
    expect(takenByA.todos[0]!.deadlineId).toBe('id-4')
  })

  it('ändert nichts, wenn das Todo schon (wieder) da ist', () => {
    const data = setup()
    const deleted = snapshotTodo(data, 'id-1')!
    expect(restoreTodo(data, deleted)).toBe(data)
    expect(snapshotTodo(data, 'gibt-es-nicht')).toBeUndefined()
  })
})

describe('restoreDeadline', () => {
  it('stellt Deadline und Verknüpfung wieder her', () => {
    const data = setup()
    const deleted = snapshotDeadline(data, 'id-4')!
    expect(deleted.linkedTodoId).toBe('id-2')
    const restored = restoreDeadline(deleteDeadline(data, 'id-4'), deleted)
    expect(restored).toEqual(data)
  })

  it('verknüpft nicht neu, wenn das Todo inzwischen weg ist', () => {
    const data = setup()
    const deleted = snapshotDeadline(data, 'id-4')!
    const restored = restoreDeadline(deleteTodo(deleteDeadline(data, 'id-4'), 'id-2'), deleted)
    expect(restored.deadlines).toHaveLength(1)
    expect(restored.todos.some((t) => t.deadlineId)).toBe(false)
  })
})
