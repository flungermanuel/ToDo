import type { CaptureErrorKind } from '@shared/capture'
import type { IsoDate } from '@shared/types'

/** Was ein Provider braucht, um aus einem Freitext Einträge zu gewinnen. */
export interface ExtractRequest {
  /** Der Eingabetext des Nutzers – ist DATEN für das Modell, nie eine Anweisung */
  text: string
  heute: IsoDate
  /** z. B. "Donnerstag" – damit das Modell "Freitag" einordnen kann, ohne zu rechnen */
  wochentag: string
  kategorien: string[]
  aktuelleKategorie?: string
}

/**
 * Austauschbare KI-Anbindung (Fake, Ollama, später evtl. Claude). Ein Provider liefert nur
 * die rohe, ungeprüfte Antwort als JSON-Wert; Prüfen und Datumsauflösung macht parseInput.
 * Fehler werden als AiError geworfen, damit die UI verständliche Meldungen zeigen kann.
 */
export interface AiProvider {
  readonly name: string
  extract(request: ExtractRequest, signal?: AbortSignal): Promise<unknown>
}

/** Fehler einer Analyse mit Art (für die UI) und verständlicher Meldung. */
export class AiError extends Error {
  readonly kind: CaptureErrorKind

  constructor(kind: CaptureErrorKind, message: string) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
  }
}
