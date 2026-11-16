import { describe, expect, it } from 'vitest'
import { resolveDate } from '../resolveDate'

// Donnerstag, 29. Oktober 2026
const DO = '2026-10-29'

function check(heute: string, cases: Array<[string, string | null]>) {
  for (const [text, expected] of cases) {
    expect(resolveDate(text, heute), `"${text}" ab ${heute}`).toBe(expected)
  }
}

describe('heute, morgen, übermorgen', () => {
  it('löst die Tageswörter auf, auch mit Füllwörtern und Tageszeit', () => {
    check(DO, [
      ['heute', '2026-10-29'],
      ['Heute', '2026-10-29'],
      ['morgen', '2026-10-30'],
      ['übermorgen', '2026-10-31'],
      ['uebermorgen', '2026-10-31'],
      ['bis morgen', '2026-10-30'],
      ['morgen früh', '2026-10-30'],
      ['morgen Abend', '2026-10-30']
    ])
  })
})

describe('Wochentage', () => {
  it('"Freitag" ist der nächste Freitag nach heute', () => {
    check(DO, [
      ['Freitag', '2026-10-30'],
      ['am Freitag', '2026-10-30'],
      ['Montag', '2026-11-02'],
      ['Donnerstag', '2026-11-05'], // heute ist Donnerstag: in 7 Tagen
      ['Sonntag', '2026-11-01'],
      ['Sonnabend', '2026-10-31']
    ])
  })

  it('"nächsten" und "übernächsten"', () => {
    check(DO, [
      ['nächsten Freitag', '2026-10-30'],
      ['kommenden Freitag', '2026-10-30'],
      ['übernächsten Freitag', '2026-11-06'],
      ['nächsten Donnerstag', '2026-11-05'],
      ['übernächsten Donnerstag', '2026-11-12']
    ])
  })

  it('"diesen" meint die laufende Woche (Mo–So) und kann nicht in die Vergangenheit', () => {
    check(DO, [
      ['diesen Freitag', '2026-10-30'],
      ['diesen Sonntag', '2026-11-01'],
      ['diesen Donnerstag', '2026-10-29'], // heute
      ['diesen Montag', null] // schon vorbei: mehrdeutig
    ])
  })

  it('ist heute Freitag, ist "Freitag" der in 7 Tagen, "diesen Freitag" heute', () => {
    check('2026-10-30', [
      ['Freitag', '2026-11-06'],
      ['diesen Freitag', '2026-10-30'],
      ['nächsten Freitag', '2026-11-06']
    ])
  })
})

describe('Wochen und relative Angaben', () => {
  it('"nächste Woche Mittwoch", Wochenstart ist Montag', () => {
    check(DO, [
      ['nächste Woche Mittwoch', '2026-11-04'],
      ['nächste Woche', '2026-11-02'],
      ['übernächste Woche Montag', '2026-11-09'],
      ['in der nächsten Woche Freitag', '2026-11-06'],
      ['diese Woche Freitag', '2026-10-30'],
      ['diese Woche Montag', null]
    ])
  })

  it('am Sonntag beginnt die nächste Woche erst am Montag danach', () => {
    // Sonntag, 1.11.: die laufende Woche ist die vom 26.10., ihr Freitag liegt zurück
    check('2026-11-01', [
      ['nächste Woche Montag', '2026-11-02'],
      ['diese Woche Freitag', null],
      ['diesen Sonntag', '2026-11-01']
    ])
  })

  it('"in 3 Tagen", "in 2 Wochen", Zahlwörter', () => {
    check(DO, [
      ['in 3 Tagen', '2026-11-01'],
      ['in einem Tag', '2026-10-30'],
      ['in 2 Wochen', '2026-11-12'],
      ['in einer Woche', '2026-11-05'],
      ['in zwei Wochen', '2026-11-12'],
      ['in einem Monat', '2026-11-29'],
      ['in 2 Monaten', '2026-12-29'],
      ['in einem Jahr', '2027-10-29']
    ])
  })

  it('Monate behalten die Tageszahl und werden am Monatsende gekürzt', () => {
    check('2026-01-31', [
      ['in einem Monat', '2026-02-28'],
      ['in 2 Monaten', '2026-03-31']
    ])
    check('2028-01-31', [['in einem Monat', '2028-02-29']]) // Schaltjahr
    check('2028-02-29', [['in einem Jahr', '2029-02-28']])
  })

  it('rechnet über Monats- und Jahresgrenzen', () => {
    check('2026-12-30', [
      ['morgen', '2026-12-31'],
      ['übermorgen', '2027-01-01'],
      ['in 3 Tagen', '2027-01-02'],
      ['in einem Monat', '2027-01-30'],
      ['Freitag', '2027-01-01']
    ])
    check('2026-10-31', [['morgen', '2026-11-01']])
  })

  it('rechnet über Schaltjahr-Tage', () => {
    check('2028-02-28', [
      ['morgen', '2028-02-29'],
      ['übermorgen', '2028-03-01']
    ])
    check('2026-02-28', [['morgen', '2026-03-01']])
  })

  it('verschluckt bei der Sommerzeit-Umstellung keinen Tag', () => {
    // Umstellung am 25.10.2026 (Winterzeit) und 29.3.2026 (Sommerzeit)
    check('2026-10-24', [
      ['morgen', '2026-10-25'],
      ['übermorgen', '2026-10-26'],
      ['in 3 Tagen', '2026-10-27']
    ])
    check('2026-03-28', [
      ['morgen', '2026-03-29'],
      ['übermorgen', '2026-03-30'],
      ['in einer Woche', '2026-04-04']
    ])
  })
})

describe('absolute Daten', () => {
  it('löst Tag, Monatsname und Zahlenformate auf', () => {
    check(DO, [
      ['12. Februar', '2027-02-12'],
      ['am 12. Februar', '2027-02-12'],
      ['12 Februar', '2027-02-12'],
      ['12. Feb.', '2027-02-12'],
      ['1. März', '2027-03-01'],
      ['1. Maerz', '2027-03-01'],
      ['12.2.', '2027-02-12'],
      ['12.02.', '2027-02-12'],
      ['12.2', '2027-02-12'],
      ['5.11.', '2026-11-05']
    ])
  })

  it('mit Jahr genau dieses Datum', () => {
    check(DO, [
      ['12.02.2027', '2027-02-12'],
      ['12.2.27', '2027-02-12'],
      ['12. Februar 2028', '2028-02-12'],
      ['1.1.2026', '2026-01-01'], // ausdrücklich in der Vergangenheit: bleibt
      ['2027-02-12', '2027-02-12']
    ])
  })

  it('ohne Jahr: nächstes Vorkommen, heute selbst zählt', () => {
    check(DO, [
      ['29.10.', '2026-10-29'],
      ['28.10.', '2027-10-28'],
      ['30.10.', '2026-10-30']
    ])
    check('2026-12-31', [['1. Januar', '2027-01-01']])
  })

  it('findet den 29. Februar im nächsten Schaltjahr', () => {
    check(DO, [['29.2.', '2028-02-29']])
    check('2028-03-01', [['29.2.', '2032-02-29']])
    check(DO, [['29.2.2027', null]])
  })

  it('Wochentag vor dem Datum stört nicht', () => {
    check(DO, [
      ['Freitag, 12. Februar', '2027-02-12'],
      ['Freitag den 13.11.', '2026-11-13']
    ])
  })

  it('erkennt unmögliche Daten nicht', () => {
    check(DO, [
      ['30. Februar', null],
      ['31.4.', null],
      ['32.1.', null],
      ['12.13.', null],
      ['0.5.', null]
    ])
  })
})

describe('Uhrzeiten', () => {
  it('werden ignoriert', () => {
    check(DO, [
      ['Freitag 15 Uhr', '2026-10-30'],
      ['Freitag um 15:30', '2026-10-30'],
      ['Freitag um 15 Uhr', '2026-10-30'],
      ['morgen 9:00', '2026-10-30'],
      ['12. Februar um 14 Uhr', '2027-02-12'],
      ['12.2. 18:00 Uhr', '2027-02-12']
    ])
  })
})

describe('nicht erkannt', () => {
  it('liefert null statt zu raten', () => {
    check(DO, [
      ['', null],
      ['   ', null],
      ['irgendwann', null],
      ['bald', null],
      ['Freitag nie', null],
      ['in drei Äpfeln', null],
      ['in 0 Tagen', null],
      ['nächste', null],
      ['Wochenende', null],
      ['15 Uhr', null]
    ])
  })

  it('lehnt ein ungültiges "heute" ab', () => {
    expect(resolveDate('morgen', 'kein-datum')).toBeNull()
  })
})
