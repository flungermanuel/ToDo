// Vertrag zwischen Renderer und Main: Kanalnamen und die Form von window.api.
// Liegt in shared, damit main, preload und renderer dieselbe Quelle nutzen.
import type { AiStatus, AnalyzeResult, CaptureContext } from './capture'
import type { AppData } from './types'

export const IpcChannels = {
  dataLoad: 'data:load',
  dataSave: 'data:save',
  dataExport: 'data:export',
  dataImportPick: 'data:import-pick',
  dataImportConfirm: 'data:import-confirm',
  appNotices: 'app:notices',
  appQuickCapture: 'app:quick-capture',
  captureAnalyze: 'capture:analyze',
  captureCancel: 'capture:cancel',
  aiStatus: 'ai:status',
  aiSetModel: 'ai:set-model',
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

export interface AppApi {
  /** Hinweise aus Main (z. B. unlesbare Daten), jeder wird nur einmal geliefert. */
  takeNotices(): Promise<string[]>
  /** Main meldet: Der globale Hotkey wurde gedrückt, die Schnellleiste soll aufgehen. */
  onQuickCapture(listener: () => void): () => void
}

export interface CaptureApi {
  /**
   * Analysiert einen Freitext (KI-Eingabe). Fehler kommen als Ergebnis zurück, nicht als
   * Ausnahme – der Text bleibt dann im Eingabefeld. Der Renderer kennt weder Modell noch URL.
   */
  analyze(text: string, context: CaptureContext): Promise<AnalyzeResult>
  /** Bricht die laufende Analyse ab (sie endet mit Fehlerart "canceled") */
  cancel(): void
}

export interface AiApi {
  /** Läuft Ollama, welche Modelle gibt es, welches ist gewählt? */
  getStatus(): Promise<AiStatus>
  /** Wählt das Modell für die KI-Eingabe (wird gemerkt) */
  setModel(model: string): Promise<void>
}

export interface WindowApi {
  minimize(): void
  toggleMaximize(): void
  close(): void
}

export interface Api {
  data: DataApi
  app: AppApi
  capture: CaptureApi
  ai: AiApi
  window: WindowApi
}
