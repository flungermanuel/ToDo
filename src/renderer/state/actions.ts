import * as core from '@core/index'
import type { CategoryColor, IsoDate, Priority } from '@shared/types'
import { getData, updateData } from './appStore'
import { showUndo } from './toastStore'

// Alles, was die UI "tun" kann. Jede Aktion ruft genau eine reine Funktion aus
// @core auf – die Komponenten müssen weder AppData noch core kennen.
// Löschen zeigt kurz "Rückgängig" an, statt vorher nachzufragen.

export const todoActions = {
  add: (input: core.NewTodo) => updateData((d) => core.createTodo(d, input)),
  update: (id: string, patch: core.TodoPatch) => updateData((d) => core.updateTodo(d, id, patch)),
  toggle: (id: string) => updateData((d) => core.toggleTodo(d, id)),
  remove: (id: string) => {
    const deleted = core.snapshotTodo(getData(), id)
    if (!deleted) return
    updateData((d) => core.deleteTodo(d, id))
    showUndo(`„${deleted.todo.titel}“ gelöscht`, () =>
      updateData((d) => core.restoreTodo(d, deleted))
    )
  },
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
  remove: (id: string) => {
    const deleted = core.snapshotDeadline(getData(), id)
    if (!deleted) return
    updateData((d) => core.deleteDeadline(d, id))
    showUndo(`Deadline „${deleted.deadline.titel}“ gelöscht`, () =>
      updateData((d) => core.restoreDeadline(d, deleted))
    )
  }
}

export const examActions = {
  add: (input: core.NewExam) => updateData((d) => core.createExam(d, input)),
  update: (id: string, patch: core.ExamPatch) => updateData((d) => core.updateExam(d, id, patch)),
  remove: (id: string) => {
    const deleted = core.snapshotExam(getData(), id)
    if (!deleted) return
    updateData((d) => core.deleteExam(d, id))
    showUndo(`Prüfung „${deleted.exam.titel}“ gelöscht`, () =>
      updateData((d) => core.restoreExam(d, deleted))
    )
  }
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
