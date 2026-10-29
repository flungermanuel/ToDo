import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import {
  canDeleteCategory,
  countTodosInCategory,
  createCategory,
  deleteCategory,
  groupTodosByCategory,
  isNameTaken,
  moveTodoToCategory,
  renameCategory,
  setCategoryColor
} from '../categories'
import { createDeadline } from '../deadlines'
import { createTodo, toggleTodo } from '../todos'
import { testContext } from './helpers'

const STUDIUM = 'cat-studium'
const PERSOENLICH = 'cat-persoenlich'

/** Zwei Todos in Studium (eins erledigt), eins in Persönlich */
function setup(): AppData {
  const ctx = testContext()
  let data = createTodo(emptyAppData(), { titel: 'Mathe', categoryId: STUDIUM }, ctx)
  data = createTodo(data, { titel: 'Physik', categoryId: STUDIUM, prioritaet: 5 }, ctx)
  data = createTodo(data, { titel: 'Gym', categoryId: PERSOENLICH }, ctx)
  return toggleTodo(data, data.todos[0]!.id)
}

describe('createCategory', () => {
  it('legt an und wählt die erste freie Farbe', () => {
    const data = createCategory(emptyAppData(), { name: '  Arbeit ' }, testContext())
    // blau und orange sind vergeben → rot ist die erste freie Farbe der Palette
    expect(data.categories[2]).toEqual({ id: 'id-1', name: 'Arbeit', farbe: 'red' })
  })

  it('lehnt leere und doppelte Namen ab (ohne Groß-/Kleinschreibung)', () => {
    const data = emptyAppData()
    expect(createCategory(data, { name: ' ' })).toBe(data)
    expect(createCategory(data, { name: 'studium' })).toBe(data)
  })

  it('übernimmt eine gewählte Farbe', () => {
    const data = createCategory(emptyAppData(), { name: 'Sport', farbe: 'green' })
    expect(data.categories[2]!.farbe).toBe('green')
  })
})

describe('renameCategory / setCategoryColor', () => {
  it('benennt um, aber nicht auf einen vergebenen Namen', () => {
    let data = renameCategory(emptyAppData(), STUDIUM, 'Uni')
    expect(data.categories[0]!.name).toBe('Uni')
    expect(renameCategory(data, STUDIUM, 'persönlich')).toBe(data)
    // gleicher Name in anderer Schreibweise für sich selbst ist erlaubt
    data = renameCategory(data, STUDIUM, 'UNI')
    expect(data.categories[0]!.name).toBe('UNI')
  })

  it('ändert die Farbe', () => {
    expect(setCategoryColor(emptyAppData(), STUDIUM, 'purple').categories[0]!.farbe).toBe('purple')
  })

  it('isNameTaken ignoriert die gerade bearbeitete Kategorie', () => {
    const data = emptyAppData()
    expect(isNameTaken(data, 'Studium')).toBe(true)
    expect(isNameTaken(data, 'Studium', STUDIUM)).toBe(false)
  })
})

describe('deleteCategory', () => {
  it('verschiebt die Todos in die Zielkategorie', () => {
    const data = deleteCategory(setup(), STUDIUM, { art: 'verschieben', zielId: PERSOENLICH })
    expect(data.categories.map((c) => c.id)).toEqual([PERSOENLICH])
    expect(data.todos).toHaveLength(3)
    expect(data.todos.every((t) => t.categoryId === PERSOENLICH)).toBe(true)
  })

  it('löscht die Todos mit, verknüpfte Deadlines bleiben', () => {
    const ctx = testContext('2026-10-29T10:00:00.000Z')
    let data = createDeadline(setup(), { titel: 'Klausur', datum: '2026-11-20' }, ctx)
    data = createTodo(data, { titel: 'Lernen', categoryId: STUDIUM, deadlineId: 'id-1' }, ctx)
    data = deleteCategory(data, STUDIUM, { art: 'todosLoeschen' })
    expect(data.todos.map((t) => t.titel)).toEqual(['Gym'])
    expect(data.deadlines).toHaveLength(1)
  })

  it('ungültiges Ziel oder letzte Kategorie → keine Änderung', () => {
    const data = setup()
    expect(deleteCategory(data, STUDIUM, { art: 'verschieben', zielId: STUDIUM })).toBe(data)
    expect(deleteCategory(data, STUDIUM, { art: 'verschieben', zielId: 'weg' })).toBe(data)

    const single = deleteCategory(data, STUDIUM, { art: 'verschieben', zielId: PERSOENLICH })
    expect(canDeleteCategory(single, PERSOENLICH)).toBe(false)
    expect(deleteCategory(single, PERSOENLICH, { art: 'todosLoeschen' })).toBe(single)
  })
})

describe('moveTodoToCategory / countTodosInCategory', () => {
  it('verschiebt ein Todo und zählt richtig', () => {
    const data = setup()
    const gymId = data.todos[2]!.id
    const moved = moveTodoToCategory(data, gymId, STUDIUM)
    expect(countTodosInCategory(moved, STUDIUM)).toBe(3)
    expect(countTodosInCategory(moved, PERSOENLICH)).toBe(0)
    expect(moveTodoToCategory(data, gymId, 'weg')).toBe(data)
  })
})

describe('groupTodosByCategory', () => {
  it('liefert alle Kategorien – auch leere – mit sortierten offenen und erledigten Todos', () => {
    let data = createCategory(setup(), { name: 'Leer' })
    const groups = groupTodosByCategory(data)
    expect(groups.map((g) => g.category.name)).toEqual(['Studium', 'Persönlich', 'Leer'])
    expect(groups[0]!.offen.map((t) => t.titel)).toEqual(['Physik'])
    expect(groups[0]!.erledigt.map((t) => t.titel)).toEqual(['Mathe'])
    expect(groups[1]!.offen.map((t) => t.titel)).toEqual(['Gym'])
    expect(groups[2]).toMatchObject({ offen: [], erledigt: [] })

    // nur eine Auswahl gruppieren
    const nurGym = groupTodosByCategory(
      data,
      data.todos.filter((t) => t.titel === 'Gym')
    )
    expect(nurGym.map((g) => g.offen.length)).toEqual([0, 1, 0])

    data = renameCategory(data, STUDIUM, 'Uni')
    expect(groupTodosByCategory(data)[0]!.category.name).toBe('Uni')
  })
})
