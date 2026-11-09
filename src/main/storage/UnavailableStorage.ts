import type { AppData } from '@shared/types'
import type { Storage } from './Storage'

/**
 * Platzhalter, wenn sich die Datenbank nicht öffnen lässt (z. B. beschädigt oder von
 * einer neueren FlungDo-Version). Jeder Zugriff schlägt fehl – die UI zeigt dann
 * "Daten konnten nicht geladen werden" und speichert nichts. So wird eine Datenbank,
 * die wir nicht lesen können, nie mit leeren Daten überschrieben.
 */
export class UnavailableStorage implements Storage {
  constructor(private readonly reason: unknown) {}

  async load(): Promise<AppData> {
    throw this.error()
  }

  async save(): Promise<void> {
    throw this.error()
  }

  async backup(): Promise<string | null> {
    throw this.error()
  }

  async flush(): Promise<void> {}

  async close(): Promise<void> {}

  private error(): Error {
    return new Error('Speicher nicht verfügbar', { cause: this.reason })
  }
}
