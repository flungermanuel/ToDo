// Auswertung der Evaluation: vergleicht das, was ein Modell geliefert hat, mit dem Erwarteten.
// Reine Funktionen ohne Modell und Netzwerk – deshalb mit normalen Tests abgesichert.

export type EvalType = 'todo' | 'deadline' | 'pruefung'

export interface ExpectedEntry {
  typ: EvalType
  titel: string
  /** Erwarteter Kalendertag, null = kein Datum */
  datum: string | null
  /** Nur gesetzt, wenn der Text die Kategorie eindeutig nahelegt */
  kategorie?: string
  /** "hoch" = Priorität 4 oder 5 */
  prioritaet?: 'hoch'
}

export interface EvalCase {
  id: number
  gruppe: string
  text: string
  kategorien?: string[]
  erwartet: ExpectedEntry[]
}

export interface ActualEntry {
  typ: EvalType
  titel: string
  datum: string | null
  kategorie: string
  prioritaet?: number
}

export interface CaseScore {
  /** Anzahl erwarteter und gelieferter Einträge */
  expected: number
  produced: number
  /** Erwartete Einträge, zu denen es einen Eintrag mit passendem Titel gab */
  matched: number
  /** Davon mit richtigem Typ / Datum */
  typ: number
  datum: number
  /** Erwartete Einträge mit Kategorie-Vorgabe, und wie viele davon stimmten */
  kategorieGeprueft: number
  kategorie: number
  prioGeprueft: number
  prio: number
  /** Alles richtig und nichts zu viel */
  komplett: boolean
}

// --- Titel tolerant vergleichen ---

function tokens(title: string): string[] {
  return title
    .toLocaleLowerCase('de')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Titel gelten als gleich, wenn mindestens die Hälfte der Wörter des erwarteten Titels
 * (auf den ersten 5 Buchstaben, damit "abgeben"/"abgabe"-artige Endungen nicht zählen)
 * im gelieferten vorkommt oder umgekehrt.
 */
export function titlesMatch(expected: string, actual: string): boolean {
  const stem = (word: string) => word.slice(0, 5)
  const a = new Set(tokens(expected).map(stem))
  const b = new Set(tokens(actual).map(stem))
  if (a.size === 0 || b.size === 0) return false
  const common = [...a].filter((t) => b.has(t)).length
  return common / a.size >= 0.5 || common / b.size >= 0.5
}

// --- Einen Fall bewerten ---

export function scoreCase(
  expected: readonly ExpectedEntry[],
  actual: readonly ActualEntry[]
): CaseScore {
  const score: CaseScore = {
    expected: expected.length,
    produced: actual.length,
    matched: 0,
    typ: 0,
    datum: 0,
    kategorieGeprueft: 0,
    kategorie: 0,
    prioGeprueft: 0,
    prio: 0,
    komplett: false
  }
  const used = new Set<number>()
  let allRight = true

  for (const want of expected) {
    const index = actual.findIndex((got, i) => !used.has(i) && titlesMatch(want.titel, got.titel))
    if (want.kategorie) score.kategorieGeprueft++
    if (want.prioritaet) score.prioGeprueft++
    if (index === -1) {
      allRight = false
      continue
    }
    used.add(index)
    const got = actual[index]!
    score.matched++

    const typOk = got.typ === want.typ
    const datumOk = got.datum === want.datum
    const kategorieOk =
      !want.kategorie ||
      got.kategorie.toLocaleLowerCase('de') === want.kategorie.toLocaleLowerCase('de')
    const prioOk = !want.prioritaet || (got.prioritaet !== undefined && got.prioritaet >= 4)

    if (typOk) score.typ++
    if (datumOk) score.datum++
    if (want.kategorie && kategorieOk) score.kategorie++
    if (want.prioritaet && prioOk) score.prio++
    if (!(typOk && datumOk && kategorieOk && prioOk)) allRight = false
  }

  score.komplett = allRight && actual.length === expected.length
  return score
}

// --- Alle Fälle zusammenfassen ---

export interface Summary {
  faelle: number
  /** Fälle, bei denen alles stimmte */
  komplett: number
  /** Analysen, die mit einem Fehler endeten (kein Ergebnis) */
  fehler: number
  /** Trefferquoten in Prozent (0–100), über alle erwarteten Einträge */
  typ: number
  titel: number
  datum: number
  kategorie: number
  prioritaet: number
  /** Fälle ohne erwartete Aufgabe, bei denen nichts geliefert wurde / Anzahl solcher Fälle */
  leerRichtig: number
  leerGesamt: number
  /** Dauer pro Analyse in Millisekunden */
  dauerMittel: number
  dauerMax: number
}

const percent = (part: number, total: number) => (total === 0 ? 100 : (part / total) * 100)

export function summarize(
  results: ReadonlyArray<{ score: CaseScore; failed: boolean; ms: number }>
): Summary {
  const sum = (pick: (s: CaseScore) => number) => results.reduce((n, r) => n + pick(r.score), 0)
  const empty = results.filter((r) => r.score.expected === 0)
  const durations = results.map((r) => r.ms)
  return {
    faelle: results.length,
    komplett: results.filter((r) => r.score.komplett).length,
    fehler: results.filter((r) => r.failed).length,
    typ: percent(
      sum((s) => s.typ),
      sum((s) => s.expected)
    ),
    titel: percent(
      sum((s) => s.matched),
      sum((s) => s.expected)
    ),
    datum: percent(
      sum((s) => s.datum),
      sum((s) => s.expected)
    ),
    kategorie: percent(
      sum((s) => s.kategorie),
      sum((s) => s.kategorieGeprueft)
    ),
    prioritaet: percent(
      sum((s) => s.prio),
      sum((s) => s.prioGeprueft)
    ),
    leerRichtig: empty.filter((r) => r.score.produced === 0).length,
    leerGesamt: empty.length,
    dauerMittel: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    dauerMax: durations.length ? Math.max(...durations) : 0
  }
}
