import type { IsoDate } from '@shared/types'
import { weekdayIndex, startOfWeek } from '../calendar'
import { addDays, isValidIsoDate } from '../dates'

// Löst deutsche Datumsausdrücke in einen Kalendertag auf. Das Modell berechnet kein Datum –
// es schreibt nur ab, was im Text steht ("übernächsten Freitag"), und der Code rechnet.
// Alles rechnet mit "YYYY-MM-DD"-Strings in UTC (über die Helfer aus dates/calendar):
// keine Zeitzonen, die Sommerzeit kann keinen Tag verschlucken. Woche = Montag bis Sonntag.
//
// Regeln (durch Tests abgesichert):
// - "Freitag", "nächsten/kommenden Freitag": der nächste Freitag NACH heute
//   (ist heute Freitag, ist es der in 7 Tagen); "übernächsten Freitag": 7 Tage später
// - "diesen Freitag": der Freitag der laufenden Woche (Mo–So), auch wenn heute Freitag ist.
//   Liegt er schon hinter uns: unbekannt – "diesen Montag" am Mittwoch ist mehrdeutig
// - "nächste Woche Mittwoch": Mittwoch der Folgewoche; ohne Wochentag der Montag
// - "in 3 Tagen / 2 Wochen / einem Monat": Monate behalten die Tageszahl, am Monatsende
//   gekürzt (31. Januar + 1 Monat = 28. Februar)
// - "12. Februar", "12.2.", "12.02.2027": ohne Jahr das nächste Vorkommen ab heute
//   (heute selbst zählt). Mit Jahr genau dieses Datum
// - Uhrzeiten werden ignoriert (sie bleiben im Titel, Uhrzeiten gibt es noch nicht)
// - Alles andere: null ("unbekannt") – die Karte zeigt dann "Datum fehlt"

/** Gibt den Kalendertag zurück oder null, wenn der Ausdruck nicht verstanden wird. */
export function resolveDate(datumText: string, heute: IsoDate): IsoDate | null {
  if (!isValidIsoDate(heute)) return null
  let tokens = tokenize(datumText)
  if (tokens.length === 0) return null

  // "in der nächsten Woche Mittwoch": das "in" gehört nicht zu "in 3 Tagen"
  if (tokens[0] === 'in' && tokens[1] !== undefined && weekOffset(tokens[1]) !== null) {
    tokens = tokens.slice(1)
  }

  return (
    singleWord(tokens, heute) ??
    weekdayExpression(tokens, heute) ??
    weekExpression(tokens, heute) ??
    inExpression(tokens, heute) ??
    absolute(tokens.join(' '), heute) ??
    weekdayBeforeDate(tokens, heute)
  )
}

// --- Zerlegen ---

const FILLERS = new Set([
  'am', 'bis', 'zum', 'zur', 'den', 'dem', 'der', 'ab', 'vom', 'schon', 'bitte',
  'spaetestens', 'frueh', 'morgens', 'vormittag', 'vormittags', 'mittag', 'mittags',
  'nachmittag', 'nachmittags', 'abend', 'abends', 'nacht', 'nachts'
]) // prettier-ignore

function tokenize(input: string): string[] {
  const text = input
    .toLocaleLowerCase('de')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Uhrzeiten: "15 Uhr", "um 15:30", "15:30", "um 15"
    .replace(/\b(um\s+)?\d{1,2}([:.]\d{2})?\s*uhr\b/g, ' ')
    .replace(/\b(um\s+)?\d{1,2}:\d{2}\b/g, ' ')
    .replace(/\bum\s+\d{1,2}(?![\d.:])/g, ' ')
    .replace(/,/g, ' ')
  return (
    text
      .split(/\s+/)
      .filter((token) => token !== '' && !FILLERS.has(token))
      // Punkt am Ende von Wörtern weg ("feb."), bei Zahlen bleibt er ("12.")
      .map((token) => (/[0-9]/.test(token) ? token : token.replace(/\.$/, '')))
  )
}

// --- Einzelne Wörter: heute, morgen, übermorgen ---

function singleWord(tokens: string[], heute: IsoDate): IsoDate | null {
  if (tokens.length !== 1) return null
  switch (tokens[0]) {
    case 'heute':
      return heute
    case 'morgen':
      return addDays(heute, 1)
    case 'uebermorgen':
      return addDays(heute, 2)
    default:
      return null
  }
}

// --- Wochentage ---

const WEEKDAYS: Record<string, number> = {
  montag: 0,
  dienstag: 1,
  mittwoch: 2,
  donnerstag: 3,
  freitag: 4,
  samstag: 5,
  sonnabend: 5,
  sonntag: 6
}

/** "übernächst…" = 2, "nächst…/kommend…" = 1, "dies…" = 0, sonst null. Endungen sind egal. */
function weekOffset(word: string): 0 | 1 | 2 | null {
  if (/^uebernaechst/.test(word)) return 2
  if (/^(naechst|kommend)/.test(word)) return 1
  if (/^dies/.test(word)) return 0
  return null
}

function weekdayExpression(tokens: string[], heute: IsoDate): IsoDate | null {
  const last = tokens[tokens.length - 1]
  const weekday = last === undefined ? undefined : WEEKDAYS[last]
  if (weekday === undefined) return null
  if (tokens.length === 1) return nextWeekday(heute, weekday, 1)
  if (tokens.length !== 2) return null

  const offset = weekOffset(tokens[0]!)
  if (offset === null) return null
  if (offset === 0) {
    // Diese Woche: der Tag muss heute oder später liegen
    const day = addDays(startOfWeek(heute), weekday)
    return day >= heute ? day : null
  }
  return nextWeekday(heute, weekday, offset)
}

/** Der `n`-te passende Wochentag nach heute (heute selbst zählt nicht). */
function nextWeekday(heute: IsoDate, weekday: number, n: number): IsoDate {
  const diff = (weekday - weekdayIndex(heute) + 7) % 7 || 7
  return addDays(heute, diff + (n - 1) * 7)
}

/** "nächste Woche", "übernächste Woche Mittwoch", "diese Woche Freitag" */
function weekExpression(tokens: string[], heute: IsoDate): IsoDate | null {
  if (tokens.length < 2 || tokens.length > 3 || tokens[1] !== 'woche') return null
  const offset = weekOffset(tokens[0]!)
  if (offset === null) return null

  const monday = addDays(startOfWeek(heute), offset * 7)
  if (tokens.length === 2) return offset === 0 ? null : monday
  const weekday = WEEKDAYS[tokens[2]!]
  if (weekday === undefined) return null
  const day = addDays(monday, weekday)
  return day >= heute ? day : null
}

// --- "in 3 Tagen" ---

const NUMBER_WORDS: Record<string, number> = {
  ein: 1, einem: 1, einer: 1, einen: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5,
  sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12
} // prettier-ignore

function inExpression(tokens: string[], heute: IsoDate): IsoDate | null {
  if (tokens.length !== 3 || tokens[0] !== 'in') return null
  const amount = /^\d+$/.test(tokens[1]!) ? Number(tokens[1]) : NUMBER_WORDS[tokens[1]!]
  if (amount === undefined || amount < 1 || amount > 1000) return null

  const unit = tokens[2]!
  if (/^tag(e|en)?$/.test(unit)) return addDays(heute, amount)
  if (/^woche(n)?$/.test(unit)) return addDays(heute, amount * 7)
  if (/^monat(e|en)?$/.test(unit)) return addMonthsClamped(heute, amount)
  if (/^jahr(e|en)?$/.test(unit)) return addMonthsClamped(heute, amount * 12)
  return null
}

/** Monate addieren, Tageszahl behalten, am Monatsende kürzen */
function addMonthsClamped(date: IsoDate, months: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const index = y * 12 + (m - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return ymd(year, month, Math.min(d, lastDay))
}

// --- Absolute Daten ---

const MONTHS: Record<string, number> = {
  januar: 1, jan: 1, februar: 2, feb: 2, maerz: 3, maer: 3, april: 4, apr: 4, mai: 5,
  juni: 6, jun: 6, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sept: 9, sep: 9,
  oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12
} // prettier-ignore

function absolute(text: string, heute: IsoDate): IsoDate | null {
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (match) {
    return exact(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  // 12.2.  12.02.  12.2  12.02.2027  12.2.27
  match = /^(\d{1,2})\.\s?(\d{1,2})\.?(?:\s?(\d{4}|\d{2}))?$/.exec(text)
  if (match) return dayMonth(Number(match[1]), Number(match[2]), match[3], heute)

  // 12. Februar  12 Feb  12. Februar 2027
  match = /^(\d{1,2})\.?\s?([a-z]+)\.?(?:\s(\d{4}))?$/.exec(text)
  if (match) {
    const month = MONTHS[match[2]!]
    return month === undefined ? null : dayMonth(Number(match[1]), month, match[3], heute)
  }
  return null
}

/** "Freitag, 12. Februar": der Wochentag davor wird nicht gebraucht, das Datum entscheidet */
function weekdayBeforeDate(tokens: string[], heute: IsoDate): IsoDate | null {
  if (tokens.length < 2 || WEEKDAYS[tokens[0]!] === undefined) return null
  return absolute(tokens.slice(1).join(' '), heute)
}

function dayMonth(
  day: number,
  month: number,
  year: string | undefined,
  heute: IsoDate
): IsoDate | null {
  if (year !== undefined) {
    return exact(year.length === 2 ? 2000 + Number(year) : Number(year), month, day)
  }
  // Ohne Jahr: das nächste Vorkommen ab heute. Bis zu 8 Jahre, damit der 29. Februar
  // auch dann gefunden wird, wenn das nächste Schaltjahr noch etwas hin ist.
  const startYear = Number(heute.slice(0, 4))
  for (let year = startYear; year <= startYear + 8; year++) {
    const candidate = exact(year, month, day)
    if (candidate !== null && candidate >= heute) return candidate
  }
  return null
}

function exact(year: number, month: number, day: number): IsoDate | null {
  const iso = ymd(year, month, day)
  return isValidIsoDate(iso) ? iso : null
}

function ymd(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
