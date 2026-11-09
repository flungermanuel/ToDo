// Vertrag zwischen Renderer und Main: Kanalnamen und die Form von window.api.
// Liegt in shared, damit main, preload und renderer dieselbe Quelle nutzen.
import type { AppData } from './types'

export const IpcChannels = {
  dataLoad: 'data:load',
  dataSave: 'data:save',
  dataExport: 'data:export',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close'
} as const

/** Ergebnis eines Exports. Den Pfad sieht der Renderer nur als Anzeige-Text. */
export type ExportResult = { status: 'saved'; fileName: string } | { status: 'canceled' }

export interface DataApi {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  /** Öffnet einen Speichern-Dialog und schreibt den gespeicherten Stand als JSON-Datei. */
  exportToFile(): Promise<ExportResult>
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
