import * as core from '@core/index'
import type { Priority } from '@shared/types'
import { updateData } from './appStore'

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
