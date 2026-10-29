// Datenmodell der App. Wird von core (Logik), main (Speicherung) und renderer (UI) genutzt.

/** Kalendertag als "YYYY-MM-DD" – bewusst ohne Uhrzeit, damit es keine Zeitzonen-Fehler gibt. */
export type IsoDate = string

/** 1 = niedrigste, 5 = höchste Priorität */
export type Priority = 1 | 2 | 3 | 4 | 5

export const PRIORITIES: readonly Priority[] = [1, 2, 3, 4, 5]
export const DEFAULT_PRIORITY: Priority = 3

/** Farben wie bei den Listen in macOS-Erinnerungen. Gespeichert wird nur der Name. */
export type CategoryColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'

export const CATEGORY_COLORS: readonly CategoryColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'gray'
]

export interface Category {
  id: string
  name: string
  farbe: CategoryColor
}

/** Startkategorien – feste IDs, damit die Migration alter Daten eindeutig ist. */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'cat-studium', name: 'Studium', farbe: 'blue' },
  { id: 'cat-persoenlich', name: 'Persönlich', farbe: 'orange' }
]

/** Hierhin wandern Todos aus V1 (die noch keine Kategorie hatten). */
export const LEGACY_CATEGORY_ID = 'cat-persoenlich'

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
  categoryId: string
  /** Geplanter Tag. Fehlt er, zählt das Datum der verknüpften Deadline (sonst "ohne Datum"). */
  datum?: IsoDate
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

/** Version 1: V1 ohne Kategorien · 2: mit Kategorien (V1.1) · 3: Todos mit Datum (V1.2) */
export const CURRENT_VERSION = 3

export interface AppData {
  version: typeof CURRENT_VERSION
  /** Reihenfolge = Reihenfolge der Anzeige. Es gibt immer mindestens eine. */
  categories: Category[]
  todos: Todo[]
  deadlines: Deadline[]
}

export function emptyAppData(): AppData {
  return {
    version: CURRENT_VERSION,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    todos: [],
    deadlines: []
  }
}
