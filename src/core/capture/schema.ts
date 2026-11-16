import type { Priority } from '@shared/types'

// Form der Einträge, die aus einem Freitext entstehen. Das Modell liefert nur Text –
// kein Datum, keine IDs. Das Datum löst der Code auf (resolveDate), IDs vergibt core.

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

export const MAX_TITLE_LENGTH = 120

/**
 * Dasselbe Schema als JSON-Schema, damit ein Provider das Modell darauf festlegen kann
 * (Ollama: Feld `format`). Reine Daten – core kennt keine Provider.
 * Die Prüfung in validate.ts ist die Wahrheit; das Modell wird trotzdem nie blind geglaubt.
 */
export const CAPTURE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    eintraege: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          typ: { type: 'string', enum: [...CAPTURE_TYPES] },
          titel: { type: 'string' },
          datumText: { type: 'string' },
          kategorie: { type: 'string' },
          prioritaet: { type: 'integer', minimum: 1, maximum: 5 }
        },
        required: ['typ', 'titel', 'datumText', 'kategorie']
      }
    }
  },
  required: ['eintraege']
} as const
