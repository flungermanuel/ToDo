import * as core from '@core/index'
import type { CategoryColor, IsoDate, Priority } from '@shared/types'
import { getData, updateData } from './appStore'

// Alles, was die UI "tun" kann. Jede Aktion ruft genau eine reine Funktion aus
// @core auf – die Komponenten müssen weder AppData noch core kennen.

export const todoActions = {
  add: (input: core.NewTodo) => updateData((d) => core.createTodo(d, input)),
  update: (id: string, patch: core.TodoPatch) => updateData((d) => core.updateTodo(d, id, patch)),
  toggle: (id: string) => updateData((d) => core.toggleTodo(d, id)),
  remove: (id: string) => updateData((d) => core.deleteTodo(d, id)),
  setPriority: (id: string, prioritaet: Priority) =>
    updateData((d) => core.updateTodo(d, id, { prioritaet })),

  addSubtask: (todoId: string, titel: string) =>
    updateData((d) => core.addSubtask(d, todoId, titel)),
  toggleSubtask: (todoId: string, subtaskId: string) =>
    updateData((d) => core.toggleSubtask(d, todoId, subtaskId)),
  renameSubtask: (todoId: string, subtaskId: string, titel: string) =>
    updateData((d) => core.renameSubtask(d, todoId, subtaskId, titel)),
  removeSubtask: (todoId: string, subtaskId: string) =>
    updateData((d) => core.deleteSubtask(d, todoId, subtaskId)),

  setDate: (id: string, datum: IsoDate | undefined) =>
    updateData((d) => core.setTodoDate(d, id, datum)),
  move: (todoId: string, categoryId: string) =>
    updateData((d) => core.moveTodoToCategory(d, todoId, categoryId)),

  link: (todoId: string, deadlineId: string) =>
    updateData((d) => core.linkTodo(d, todoId, deadlineId)),
  unlink: (todoId: string) => updateData((d) => core.unlinkTodo(d, todoId))
}

export const deadlineActions = {
  add: (input: core.NewDeadline) => updateData((d) => core.createDeadline(d, input)),
  update: (id: string, patch: core.DeadlinePatch) =>
    updateData((d) => core.updateDeadline(d, id, patch)),
  toggle: (id: string) => updateData((d) => core.toggleDeadline(d, id)),
  remove: (id: string) => updateData((d) => core.deleteDeadline(d, id))
}

export const categoryActions = {
  /** Legt an und gibt die neue ID zurück (oder null, wenn der Name ungültig/vergeben ist) */
  add: (name: string, farbe?: CategoryColor): string | null => {
    const before = new Set(getData().categories.map((c) => c.id))
    updateData((d) => core.createCategory(d, { name, farbe }))
    return getData().categories.find((c) => !before.has(c.id))?.id ?? null
  },
  rename: (id: string, name: string) => updateData((d) => core.renameCategory(d, id, name)),
  setColor: (id: string, farbe: CategoryColor) =>
    updateData((d) => core.setCategoryColor(d, id, farbe)),
  remove: (id: string, strategie: core.DeleteStrategy) =>
    updateData((d) => core.deleteCategory(d, id, strategie))
}
