import type { DataSummary } from '@shared/ipc'
import type { AppData } from '@shared/types'

/**
 * Wie viele Einträge welcher Art ein Datenstand enthält. Genutzt für die Nachfrage
 * vor dem Import und zum Gegenprüfen bei der Übernahme in die Datenbank.
 */
export function countData(data: AppData): DataSummary {
  return {
    categories: data.categories.length,
    todos: data.todos.length,
    subtasks: data.todos.reduce((sum, t) => sum + t.unteraufgaben.length, 0),
    deadlines: data.deadlines.length,
    exams: data.exams.length
  }
}
