import {
  hasCaptureShape,
  isValidIsoDate,
  resolveDate,
  validateCaptureOutput,
  weekdayIndex
} from '@core/index'
import type { AnalyzeResult, CaptureContext, CaptureError, ParsedEntry } from '@shared/capture'
import { AiError, type AiProvider, type ExtractRequest } from './Provider'

// Der ganze Ablauf einer Analyse: Freitext → Provider → Prüfung → Datum auflösen.
// Das Modell liefert nur Text; geprüft und gerechnet wird hier und in core.
// Eingaben und Antworten werden weder gespeichert noch geloggt.

/** Längere Eingaben sind kein Todo mehr, sondern ein Dokument – und würden kleine Modelle bremsen. */
export const MAX_INPUT_LENGTH = 1000

const WEEKDAY_NAMES = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag'
]

export async function parseInput(
  provider: AiProvider,
  text: string,
  context: CaptureContext,
  signal?: AbortSignal
): Promise<AnalyzeResult> {
  const input = text.trim()
  if (!input) return { status: 'ok', entries: [], notices: [] }
  if (input.length > MAX_INPUT_LENGTH) {
    return fail('too-long', `Der Text ist zu lang (mehr als ${MAX_INPUT_LENGTH} Zeichen).`)
  }
  if (!isValidIsoDate(context.heute)) return fail('failed', 'Das heutige Datum ist ungültig.')

  const request: ExtractRequest = {
    text: input,
    heute: context.heute,
    wochentag: WEEKDAY_NAMES[weekdayIndex(context.heute)]!,
    kategorien: context.kategorien,
    ...(context.aktuelleKategorie ? { aktuelleKategorie: context.aktuelleKategorie } : {})
  }

  try {
    const raw = await extractWithRetry(provider, request, signal)
    const { entries, notices } = validateCaptureOutput(raw)
    const parsed: ParsedEntry[] = entries.map((entry) => ({
      ...entry,
      datum: entry.datumText ? resolveDate(entry.datumText, context.heute) : null
    }))
    return { status: 'ok', entries: parsed, notices }
  } catch (error) {
    return { status: 'error', error: toCaptureError(error, signal) }
  }
}

/** Bei einer Antwort in falscher Form genau ein zweiter Versuch, danach Fehler. */
async function extractWithRetry(
  provider: AiProvider,
  request: ExtractRequest,
  signal?: AbortSignal
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await provider.extract(request, signal)
      if (hasCaptureShape(raw)) return raw
    } catch (error) {
      const retryable = error instanceof AiError && error.kind === 'invalid'
      if (!retryable || attempt === 1) throw error
    }
    if (signal?.aborted) throw new AiError('canceled', 'Abgebrochen')
  }
  throw new AiError('invalid', 'Die Antwort des Modells war nicht brauchbar.')
}

function toCaptureError(error: unknown, signal?: AbortSignal): CaptureError {
  if (signal?.aborted) return { kind: 'canceled', message: 'Abgebrochen' }
  if (error instanceof AiError) return { kind: error.kind, message: error.message }
  // Bewusst ohne Details: Die Meldung könnte Teile der Eingabe enthalten
  return { kind: 'failed', message: 'Die Analyse ist fehlgeschlagen.' }
}

function fail(kind: CaptureError['kind'], message: string): AnalyzeResult {
  return { status: 'error', error: { kind, message } }
}
