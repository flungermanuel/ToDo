// Form der Einträge, die aus einem Freitext entstehen. Das Modell liefert nur Text –
// kein Datum, keine IDs. Das Datum löst der Code auf (resolveDate), IDs vergibt core.
// Die Typen liegen in shared (der Renderer braucht sie auch), hier wird nur re-exportiert.
import { CAPTURE_TYPES } from '@shared/capture'

export { CAPTURE_TYPES } from '@shared/capture'
export type { CaptureEntry, CaptureType } from '@shared/capture'

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
