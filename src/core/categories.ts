import {
  CATEGORY_COLORS,
  type AppData,
  type Category,
  type CategoryColor,
  type Todo
} from '@shared/types'
import { defaultContext, type CoreContext } from './context'
import { cleanTitle } from './text'
import { sortTodos } from './todos'

// Kategorien für Todos. Regeln:
// - Namen sind nicht leer und eindeutig (ohne Groß-/Kleinschreibung)
// - Es gibt immer mindestens eine Kategorie – jedes Todo braucht eine
// - Beim Löschen wird entschieden, was mit den Todos passiert (verschieben oder löschen)

export interface NewCategory {
  name: string
  /** Ohne Angabe: die erste Farbe der Palette, die noch nicht vergeben ist */
  farbe?: CategoryColor
}

export function createCategory(
  data: AppData,
  input: NewCategory,
  ctx: CoreContext = defaultContext
): AppData {
  const name = cleanTitle(input.name)
  if (!name || isNameTaken(data, name)) return data

  const category: Category = { id: ctx.newId(), name, farbe: input.farbe ?? nextColor(data) }
  return { ...data, categories: [...data.categories, category] }
}

export function renameCategory(data: AppData, id: string, name: string): AppData {
  const clean = cleanTitle(name)
  if (!clean || isNameTaken(data, clean, id)) return data
  return mapCategory(data, id, (c) => ({ ...c, name: clean }))
}

export function setCategoryColor(data: AppData, id: string, farbe: CategoryColor): AppData {
  return mapCategory(data, id, (c) => ({ ...c, farbe }))
}

/** Ist der Name schon vergeben? `exceptId` = die Kategorie, die gerade umbenannt wird. */
export function isNameTaken(
  data: Pick<AppData, 'categories'>,
  name: string,
  exceptId?: string
): boolean {
  const wanted = name.trim().toLocaleLowerCase('de')
  return data.categories.some((c) => c.id !== exceptId && c.name.toLocaleLowerCase('de') === wanted)
}

// --- Löschen ---

export type DeleteStrategy = { art: 'verschieben'; zielId: string } | { art: 'todosLoeschen' }

export function canDeleteCategory(data: AppData, id: string): boolean {
  return data.categories.length > 1 && data.categories.some((c) => c.id === id)
}

export function deleteCategory(data: AppData, id: string, strategie: DeleteStrategy): AppData {
  if (!canDeleteCategory(data, id)) return data
  const categories = data.categories.filter((c) => c.id !== id)

  if (strategie.art === 'verschieben') {
    if (strategie.zielId === id || !categories.some((c) => c.id === strategie.zielId)) return data
    return {
      ...data,
      categories,
      todos: data.todos.map((t) =>
        t.categoryId === id ? { ...t, categoryId: strategie.zielId } : t
      )
    }
  }

  // Todos werden mitgelöscht – verknüpfte Deadlines bleiben bestehen (wie bei deleteTodo)
  return { ...data, categories, todos: data.todos.filter((t) => t.categoryId !== id) }
}

// --- Todos und Kategorien ---

export function moveTodoToCategory(data: AppData, todoId: string, categoryId: string): AppData {
  if (!data.categories.some((c) => c.id === categoryId)) return data
  const todo = data.todos.find((t) => t.id === todoId)
  if (!todo || todo.categoryId === categoryId) return data
  return {
    ...data,
    todos: data.todos.map((t) => (t.id === todoId ? { ...t, categoryId } : t))
  }
}

export function countTodosInCategory(data: AppData, categoryId: string): number {
  return data.todos.filter((t) => t.categoryId === categoryId).length
}

export interface CategoryGroup {
  category: Category
  offen: Todo[]
  erledigt: Todo[]
}

/**
 * Alle Kategorien in ihrer Reihenfolge – auch leere –, jeweils mit ihren
 * sortierten offenen und erledigten Todos. Mit `todos` lässt sich eine Auswahl
 * gruppieren (z. B. nur die Todos eines Tages), sonst alle.
 */
export function groupTodosByCategory(
  data: AppData,
  todos: readonly Todo[] = data.todos
): CategoryGroup[] {
  const sorted = sortTodos(todos)
  return data.categories.map((category) => {
    const todos = sorted.filter((t) => t.categoryId === category.id)
    return {
      category,
      offen: todos.filter((t) => !t.erledigt),
      erledigt: todos.filter((t) => t.erledigt)
    }
  })
}

// --- Hilfsfunktionen ---

function nextColor(data: AppData): CategoryColor {
  const used = new Set(data.categories.map((c) => c.farbe))
  return (
    CATEGORY_COLORS.find((c) => !used.has(c)) ??
    CATEGORY_COLORS[data.categories.length % CATEGORY_COLORS.length]!
  )
}

function mapCategory(data: AppData, id: string, fn: (c: Category) => Category): AppData {
  if (!data.categories.some((c) => c.id === id)) return data
  return { ...data, categories: data.categories.map((c) => (c.id === id ? fn(c) : c)) }
}
