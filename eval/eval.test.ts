import { describe, expect, it } from 'vitest'
import { isValidIsoDate, resolveDate } from '@core/index'
import cases from './cases.json'
import { scoreCase, summarize, titlesMatch, type EvalCase } from './score'

// Läuft in `npm test` (ohne Modell): prüft, dass die Testfälle in Ordnung sind und die
// Auswertung richtig zählt. Das Modell selbst wird nur von `npm run eval` befragt.

describe('eval/cases.json', () => {
  const list = cases.faelle as EvalCase[]

  it('hat 40 Fälle mit eindeutigen Nummern', () => {
    expect(list).toHaveLength(40)
    expect(new Set(list.map((c) => c.id)).size).toBe(40)
  })

  it('hat nur gültige Typen, Daten und Kategorien', () => {
    for (const c of list) {
      const names = c.kategorien ?? cases.kategorien
      for (const e of c.erwartet) {
        expect(['todo', 'deadline', 'pruefung'], `#${c.id}`).toContain(e.typ)
        if (e.datum !== null) expect(isValidIsoDate(e.datum), `#${c.id} ${e.datum}`).toBe(true)
        if (e.kategorie) expect(names, `#${c.id}`).toContain(e.kategorie)
      }
    }
  })

  it('deckt alle geforderten Bereiche ab', () => {
    const groups = new Set(list.map((c) => c.gruppe.split(':')[0]))
    for (const wanted of [
      'einfaches Todo',
      'Deadline',
      'Prüfung',
      'mehrere Einträge',
      'Datum',
      'Priorität',
      'Kategorie',
      'Störfall'
    ]) {
      expect(groups, wanted).toContain(wanted)
    }
    expect(list.some((c) => c.erwartet.length === 0)).toBe(true)
  })

  it('hat Datumsangaben, die resolveDate für diese Texte aus der Wochentag-Logik bestätigt', () => {
    // Stichproben: die Erwartungen wurden von Hand gerechnet und müssen zum Code passen
    const heute = cases.heute
    expect(resolveDate('Freitag', heute)).toBe('2026-11-20')
    expect(resolveDate('übermorgen', heute)).toBe('2026-11-18')
    expect(resolveDate('übernächsten Freitag', heute)).toBe('2026-11-27')
    expect(resolveDate('nächste Woche Mittwoch', heute)).toBe('2026-11-25')
    expect(resolveDate('übernächste Woche Dienstag', heute)).toBe('2026-12-01')
    expect(resolveDate('in einem Monat', heute)).toBe('2026-12-16')
    expect(resolveDate('in 2 Wochen', heute)).toBe('2026-11-30')
    expect(resolveDate('nächsten Montag', heute)).toBe('2026-11-23')
    expect(resolveDate('Sonntag', heute)).toBe('2026-11-22')
    expect(resolveDate('3.2.', heute)).toBe('2027-02-03')
    expect(resolveDate('20.1.', heute)).toBe('2027-01-20')
  })
})

describe('titlesMatch', () => {
  it('vergleicht tolerant', () => {
    expect(titlesMatch('Abgabe Übungsblatt 5', 'Übungsblatt 5 abgeben')).toBe(true)
    expect(titlesMatch('Mechanik', 'Klausur Mechanik')).toBe(true)
    expect(titlesMatch('Zahnarzt anrufen', 'zahnarzt anrufn')).toBe(true)
    expect(titlesMatch('Mama anrufen', 'Einkaufen')).toBe(false)
    expect(titlesMatch('', 'x')).toBe(false)
  })
})

describe('scoreCase', () => {
  const want = [
    { typ: 'deadline', titel: 'Abgabe Statistik', datum: '2026-11-20', kategorie: 'Studium' },
    { typ: 'todo', titel: 'Mama anrufen', datum: null }
  ] as const

  it('bewertet eine vollständig richtige Antwort', () => {
    const score = scoreCase(want, [
      { typ: 'todo', titel: 'Mama anrufen', datum: null, kategorie: '' },
      { typ: 'deadline', titel: 'Abgabe Statistik', datum: '2026-11-20', kategorie: 'studium' }
    ])
    expect(score).toMatchObject({
      matched: 2,
      typ: 2,
      datum: 2,
      kategorie: 1,
      kategorieGeprueft: 1,
      komplett: true
    })
  })

  it('zählt falschen Typ, falsches Datum und fehlende Einträge einzeln', () => {
    const score = scoreCase(want, [
      { typ: 'todo', titel: 'Abgabe Statistik', datum: null, kategorie: 'Persönlich' }
    ])
    expect(score).toMatchObject({ matched: 1, typ: 0, datum: 0, kategorie: 0, komplett: false })
  })

  it('wertet einen überzähligen Eintrag als nicht komplett', () => {
    const score = scoreCase(want.slice(1), [
      { typ: 'todo', titel: 'Mama anrufen', datum: null, kategorie: '' },
      { typ: 'todo', titel: 'Etwas Erfundenes', datum: null, kategorie: '' }
    ])
    expect(score.matched).toBe(1)
    expect(score.komplett).toBe(false)
  })

  it('ordnet jeden gelieferten Eintrag höchstens einmal zu', () => {
    const score = scoreCase(
      [
        { typ: 'todo', titel: 'Wäsche waschen', datum: null },
        { typ: 'todo', titel: 'Wäsche waschen', datum: null }
      ],
      [{ typ: 'todo', titel: 'Wäsche waschen', datum: null, kategorie: '' }]
    )
    expect(score.matched).toBe(1)
  })

  it('"Text ohne Aufgabe" ist nur mit leerer Antwort richtig', () => {
    expect(scoreCase([], []).komplett).toBe(true)
    expect(scoreCase([], [{ typ: 'todo', titel: 'x', datum: null, kategorie: '' }]).komplett).toBe(
      false
    )
  })

  it('prüft die Priorität nur, wenn sie erwartet wird', () => {
    const wantPrio = [{ typ: 'todo', titel: 'Passbild', datum: null, prioritaet: 'hoch' }] as const
    const got = { typ: 'todo', titel: 'Passbild', datum: null, kategorie: '' } as const
    expect(scoreCase(wantPrio, [{ ...got, prioritaet: 5 }])).toMatchObject({
      prio: 1,
      komplett: true
    })
    expect(scoreCase(wantPrio, [got])).toMatchObject({ prio: 0, komplett: false })
  })
})

describe('summarize', () => {
  it('rechnet Trefferquoten und Dauer aus', () => {
    const ok = scoreCase(
      [{ typ: 'todo', titel: 'A b', datum: null }],
      [{ typ: 'todo', titel: 'A b', datum: null, kategorie: '' }]
    )
    const bad = scoreCase([{ typ: 'todo', titel: 'C d', datum: '2026-11-20' }], [])
    const empty = scoreCase([], [])
    const summary = summarize([
      { score: ok, failed: false, ms: 1000 },
      { score: bad, failed: true, ms: 3000 },
      { score: empty, failed: false, ms: 2000 }
    ])
    expect(summary).toMatchObject({
      faelle: 3,
      komplett: 2,
      fehler: 1,
      typ: 50,
      titel: 50,
      leerRichtig: 1,
      leerGesamt: 1,
      dauerMittel: 2000,
      dauerMax: 3000
    })
  })
})
