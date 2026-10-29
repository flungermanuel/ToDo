import { describe, expect, it } from 'vitest'
import { addDays, addMonths, daysBetween, isValidIsoDate, toIsoDate } from '../dates'

describe('toIsoDate', () => {
  it('nutzt den lokalen Kalendertag und füllt mit Nullen auf', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('isValidIsoDate', () => {
  it.each(['2026-10-29', '2028-02-29'])('akzeptiert %s', (v) => {
    expect(isValidIsoDate(v)).toBe(true)
  })

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '29.10.2026', '', '2026-1-1'])(
    'lehnt %s ab',
    (v) => {
      expect(isValidIsoDate(v)).toBe(false)
    }
  )
})

describe('daysBetween', () => {
  it('zählt Tage in beide Richtungen', () => {
    expect(daysBetween('2026-10-29', '2026-10-29')).toBe(0)
    expect(daysBetween('2026-10-29', '2026-11-01')).toBe(3)
    expect(daysBetween('2026-10-29', '2026-10-27')).toBe(-2)
  })

  it('ist über die Zeitumstellung und Jahreswechsel stabil', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })
})

describe('addDays', () => {
  it('rechnet über Monatsgrenzen', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('addMonths', () => {
  it('liefert den Monatsersten, auch über Jahresgrenzen', () => {
    expect(addMonths('2026-10-29', 1)).toBe('2026-11-01')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01')
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01')
    expect(addMonths('2026-10-29', -22)).toBe('2024-12-01')
  })
})
