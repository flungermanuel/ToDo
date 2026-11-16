// Typen der KI-Eingabe, gemeinsam für core (Schema), main (Analyse) und renderer (Vorschau).
// Bewusst nur Typen und Konstanten: Der Renderer kennt weder Modelle noch URLs.
import type { IsoDate, Priority } from './types'

export type CaptureType = 'todo' | 'deadline' | 'pruefung'

export const CAPTURE_TYPES: readonly CaptureType[] = ['todo', 'deadline', 'pruefung']

/** Ein geprüfter Eintrag. Leere Strings stehen für "nicht angegeben". */
export interface CaptureEntry {
  typ: CaptureType
  /** Kurzer, bereinigter Titel (höchstens MAX_TITLE_LENGTH Zeichen) */
  titel: string
  /** Datumsangabe, wie sie im Eingabetext steht, z. B. "übernächsten Freitag" */
  datumText: string
  /** Name einer vorhandenen Kategorie oder leer */
  kategorie: string
  /** Nur gesetzt, wenn der Text es nahelegt – sonst gilt der Standard */
  prioritaet?: Priority
}

/** Was die Analyse über die App wissen muss. */
export interface CaptureContext {
  /** Heutiger Kalendertag, daran werden relative Angaben aufgelöst */
  heute: IsoDate
  /** Namen der vorhandenen Kategorien */
  kategorien: string[]
  /** Name der aktuell gewählten Kategorie */
  aktuelleKategorie?: string
}

/** Ein Eintrag mit vom Code aufgelöstem Datum (null = nicht erkannt oder nicht angegeben). */
export interface ParsedEntry extends CaptureEntry {
  datum: IsoDate | null
}

export type CaptureErrorKind =
  | 'unreachable' // Ollama läuft nicht
  | 'model-missing' // Modell nicht installiert
  | 'timeout'
  | 'invalid' // Antwort auch nach Wiederholung unbrauchbar
  | 'canceled'
  | 'too-long'
  | 'failed'

export interface CaptureError {
  kind: CaptureErrorKind
  /** Verständliche Meldung für die Anzeige */
  message: string
}

/** Ergebnis der Analyse – Fehler sind Daten, damit der Eingabetext nie verloren geht. */
export type AnalyzeResult =
  | { status: 'ok'; entries: ParsedEntry[]; notices: string[] }
  | { status: 'error'; error: CaptureError }

/** Zustand der KI-Anbindung für die Einstellungen */
export interface AiStatus {
  provider: 'ollama' | 'fake'
  /** Das Modell, mit dem analysiert wird */
  model: string
  /** Antwortet Ollama? */
  reachable: boolean
  /** Installierte Modelle (leer, wenn Ollama nicht erreichbar ist) */
  models: string[]
}
