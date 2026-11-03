import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '@shared/types'
import { createExam, deleteExam, examsForDay, examViews, updateExam } from '../exams'
import { restoreExam, snapshotExam } from '../restore'
import { testContext } from './helpers'

const TODAY = '2026-10-29'

function setup(): AppData {
  const ctx = testContext()
  let data = emptyAppData()
  data = createExam(data, { titel: 'Statistik', datum: '2026-11-10' }, ctx)
  data = createExam(data, { titel: 'Analysis', datum: '2026-10-20' }, ctx)
  data = createExam(data, { titel: 'Algebra', datum: '2026-11-10' }, ctx)
  return data
}

describe('createExam / updateExam / deleteExam', () => {
  it('legt an, bereinigt den Titel und lehnt Ungültiges ab', () => {
    const data = emptyAppData()
    expect(createExam(data, { titel: ' ', datum: TODAY })).toBe(data)
    expect(createExam(data, { titel: 'X', datum: '2026-02-30' })).toBe(data)
    const created = createExam(data, { titel: '  Statistik  I ', datum: TODAY }, testContext())
    expect(created.exams).toEqual([{ id: 'id-1', titel: 'Statistik I', datum: TODAY }])
  })

  it('ändert Titel und Datum, ignoriert ungültige Werte', () => {
    const data = setup()
    const changed = updateExam(data, 'id-1', { titel: 'Statistik II', datum: '2026-12-01' })
    expect(changed.exams[0]).toEqual({ id: 'id-1', titel: 'Statistik II', datum: '2026-12-01' })
    expect(updateExam(data, 'id-1', { titel: '', datum: 'kaputt' }).exams[0]).toEqual(data.exams[0])
    expect(updateExam(data, 'gibt-es-nicht', { titel: 'X' })).toBe(data)
  })

  it('löscht und stellt an alter Position wieder her', () => {
    const data = setup()
    const deleted = snapshotExam(data, 'id-2')!
    const without = deleteExam(data, 'id-2')
    expect(without.exams).toHaveLength(2)
    expect(restoreExam(without, deleted)).toEqual(data)
    expect(restoreExam(data, deleted)).toBe(data)
  })
})

describe('examViews / examsForDay', () => {
  it('sortiert nach Datum, dann alphabetisch, mit Countdown', () => {
    const views = examViews(setup(), TODAY)
    expect(views.map((v) => [v.exam.titel, v.tageBis, v.vorbei])).toEqual([
      ['Analysis', -9, true],
      ['Algebra', 12, false],
      ['Statistik', 12, false]
    ])
  })

  it('heute ist noch nicht vorbei', () => {
    const data = createExam(emptyAppData(), { titel: 'Heute', datum: TODAY }, testContext())
    expect(examViews(data, TODAY)[0]).toMatchObject({ tageBis: 0, vorbei: false })
  })

  it('liefert die Prüfungen eines Tages', () => {
    expect(examsForDay(setup(), '2026-11-10').map((e) => e.titel)).toEqual(['Algebra', 'Statistik'])
  })
})
