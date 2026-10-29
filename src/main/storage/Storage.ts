import type { AppData } from '@shared/types'

/**
 * Speicher-Schnittstelle. Der Rest der App kennt nur load/save –
 * ob dahinter eine JSON-Datei oder später SQLite steckt, ist egal.
 */
export interface Storage {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  /** Wartet, bis alle laufenden Schreibvorgänge fertig sind (z. B. vor dem Beenden). */
  flush(): Promise<void>
}
