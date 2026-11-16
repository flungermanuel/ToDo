import type { Category, Priority } from '@shared/types'
import { cleanTitle } from '../text'
import { CAPTURE_TYPES, MAX_TITLE_LENGTH, type CaptureEntry, type CaptureType } from './schema'

// Alles, was vom Modell kommt, gilt als unvertraut: Es wird hier nur gegen das Schema
// geprüft und nie ausgeführt. Unbrauchbare Einträge fallen einzeln weg – die anderen bleiben.

export interface CaptureValidation {
  entries: CaptureEntry[]
  /** Verständliche Hinweise, z. B. "Titel gekürzt" – für die Anzeige in der Vorschau */
  notices: string[]
}

/** Akzeptiert `{ eintraege: [...] }` oder direkt eine Liste. Alles andere ergibt nichts. */
export function validateCaptureOutput(raw: unknown): CaptureValidation {
  const list = extractList(raw)
  const entries: CaptureEntry[] = []
  const notices: string[] = []

  list.forEach((item, index) => {
    const result = validateEntry(item)
    if (result.entry) entries.push(result.entry)
    for (const notice of result.notices) notices.push(`Eintrag ${index + 1}: ${notice}`)
  })
  return { entries, notices }
}

function extractList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (isRecord(raw) && Array.isArray(raw.eintraege)) return raw.eintraege
  return []
}

function validateEntry(item: unknown): { entry?: CaptureEntry; notices: string[] } {
  if (!isRecord(item)) return { notices: ['verworfen (kein gültiger Eintrag)'] }

  const typ = parseType(item.typ)
  if (!typ) return { notices: ['verworfen (unbekannter Typ)'] }

  const titel = typeof item.titel === 'string' ? cleanTitle(item.titel) : null
  if (!titel) return { notices: ['verworfen (Titel fehlt)'] }

  const notices: string[] = []
  const shortTitle = titel.length > MAX_TITLE_LENGTH ? shorten(titel) : titel
  if (shortTitle !== titel) notices.push(`Titel auf ${MAX_TITLE_LENGTH} Zeichen gekürzt`)

  const entry: CaptureEntry = {
    typ,
    titel: shortTitle,
    datumText: text(item.datumText),
    kategorie: text(item.kategorie)
  }
  const prioritaet = parsePriority(item.prioritaet)
  if (prioritaet) entry.prioritaet = prioritaet
  return { entry, notices }
}

function parseType(value: unknown): CaptureType | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLocaleLowerCase('de').replace('ü', 'ue')
  return CAPTURE_TYPES.find((t) => t === normalized) ?? null
}

function parsePriority(value: unknown): Priority | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined
  return value >= 1 && value <= 5 ? (value as Priority) : undefined
}

function text(value: unknown): string {
  return typeof value === 'string' ? (cleanTitle(value) ?? '') : ''
}

function shorten(titel: string): string {
  return titel.slice(0, MAX_TITLE_LENGTH).trimEnd()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// --- Kategorie ---

/**
 * Ordnet den vom Modell genannten Namen einer vorhandenen Kategorie zu (ohne Beachtung
 * von Groß-/Kleinschreibung). Unbekannt oder leer: die aktuell gewählte Kategorie,
 * sonst die erste. Gibt die Kategorie-ID zurück.
 */
export function matchCategory(
  name: string,
  categories: readonly Category[],
  currentId?: string
): string {
  const wanted = name.trim().toLocaleLowerCase('de')
  const found = wanted
    ? categories.find((c) => c.name.toLocaleLowerCase('de') === wanted)
    : undefined
  if (found) return found.id
  const current = categories.find((c) => c.id === currentId)
  return (current ?? categories[0])?.id ?? ''
}
