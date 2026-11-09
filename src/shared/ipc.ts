// Vertrag zwischen Renderer und Main: Kanalnamen und die Form von window.api.
// Liegt in shared, damit main, preload und renderer dieselbe Quelle nutzen.
import type { AppData } from './types'

export const IpcChannels = {
  dataLoad: 'data:load',
  dataSave: 'data:save',
  dataExport: 'data:export',
  dataImportPick: 'data:import-pick',
  dataImportConfirm: 'data:import-confirm',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close'
} as const

/** Ergebnis eines Exports. Den Pfad sieht der Renderer nur als Anzeige-Text. */
export type ExportResult = { status: 'saved'; fileName: string } | { status: 'canceled' }

/** Wie viel in einem Datenstand steckt – für die Nachfrage vor dem Import. */
export interface DataSummary {
  categories: number
  todos: number
  subtasks: number
  deadlines: number
  exams: number
}

export interface ReadyImportPreview {
  status: 'ready'
  fileName: string
  summary: DataSummary
}

export type ImportPreview =
  ReadyImportPreview | { status: 'canceled' } | { status: 'invalid'; message: string }

export interface DataApi {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  /** Öffnet einen Speichern-Dialog und schreibt den gespeicherten Stand als JSON-Datei. */
  exportToFile(): Promise<ExportResult>
  /**
   * Import in zwei Schritten, damit die UI dazwischen nachfragen kann:
   * 1. Datei wählen, prüfen und bei Bedarf migrieren → Vorschau (noch nichts überschrieben)
   * 2. Bestätigen → aktuellen Stand sichern, importierte Daten speichern und zurückgeben
   */
  pickImportFile(): Promise<ImportPreview>
  confirmImport(): Promise<AppData>
}

export interface WindowApi {
  minimize(): void
  toggleMaximize(): void
  close(): void
}

export interface Api {
  data: DataApi
  window: WindowApi
}
