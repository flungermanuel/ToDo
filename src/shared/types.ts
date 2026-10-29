// Datenmodell der App. Wird von core (Logik), main (Speicherung) und renderer (UI) genutzt.

/** Kalendertag als "YYYY-MM-DD" – bewusst ohne Uhrzeit, damit es keine Zeitzonen-Fehler gibt. */
export type IsoDate = string

/** 1 = niedrigste, 5 = höchste Priorität */
export type Priority = 1 | 2 | 3 | 4 | 5

export const PRIORITIES: readonly Priority[] = [1, 2, 3, 4, 5]
export const DEFAULT_PRIORITY: Priority = 3

export interface Subtask {
  id: string
  titel: string
  erledigt: boolean
}

export interface Todo {
  id: string
  titel: string
  erledigt: boolean
  /** ISO-Zeitstempel */
  erstelltAm: string
  prioritaet: Priority
  unteraufgaben: Subtask[]
  /** Optionale Verknüpfung: Todo abhaken → Deadline zeigt ✓ */
  deadlineId?: string
}

export interface Deadline {
  id: string
  titel: string
  datum: IsoDate
  /** Nur relevant, wenn kein Todo verknüpft ist – sonst zählt der Status des Todos. */
  erledigt: boolean
  prioritaet: Priority
}

export const CURRENT_VERSION = 1

export interface AppData {
  version: typeof CURRENT_VERSION
  todos: Todo[]
  deadlines: Deadline[]
}

export function emptyAppData(): AppData {
  return { version: CURRENT_VERSION, todos: [], deadlines: [] }
}
