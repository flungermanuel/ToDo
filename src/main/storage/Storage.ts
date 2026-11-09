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
  /**
   * Sichert den gespeicherten Stand, bevor er überschrieben wird (z. B. vor einem Import).
   * `tag` steht im Namen der Sicherung. Gibt es noch nichts zu sichern: null.
   */
  backup(tag: string): Promise<string | null>
}
