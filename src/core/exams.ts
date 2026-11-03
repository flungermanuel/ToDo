import type { AppData, Exam, IsoDate } from '@shared/types'
import { defaultContext, type CoreContext } from './context'
import { daysBetween, isValidIsoDate } from './dates'
import { cleanTitle } from './text'

// Prüfungen: nur Titel und Datum. Sie werden nicht abgehakt – eine Prüfung ist
// "vorbei", sobald ihr Tag vorbei ist. Alle Funktionen sind rein (wie bei Todos).

export interface NewExam {
  titel: string
  datum: IsoDate
}

export function createExam(
  data: AppData,
  input: NewExam,
  ctx: CoreContext = defaultContext
): AppData {
  const titel = cleanTitle(input.titel)
  if (!titel || !isValidIsoDate(input.datum)) return data
  const exam: Exam = { id: ctx.newId(), titel, datum: input.datum }
  return { ...data, exams: [...data.exams, exam] }
}

export interface ExamPatch {
  titel?: string
  datum?: IsoDate
}

export function updateExam(data: AppData, id: string, patch: ExamPatch): AppData {
  if (!data.exams.some((e) => e.id === id)) return data
  return {
    ...data,
    exams: data.exams.map((exam) => {
      if (exam.id !== id) return exam
      const next = { ...exam }
      if (patch.titel !== undefined) {
        const titel = cleanTitle(patch.titel)
        if (titel) next.titel = titel
      }
      if (patch.datum !== undefined && isValidIsoDate(patch.datum)) next.datum = patch.datum
      return next
    })
  }
}

export function deleteExam(data: AppData, id: string): AppData {
  return { ...data, exams: data.exams.filter((e) => e.id !== id) }
}

// --- Anzeige ---

export interface ExamView {
  exam: Exam
  /** Tage bis zur Prüfung: 0 = heute, negativ = vorbei */
  tageBis: number
  vorbei: boolean
}

/** Ab so vielen Tagen vorher gilt eine Prüfung als "bald" (wird farbig hervorgehoben) */
export const EXAM_SOON_DAYS = 7

/** Nach Datum sortiert, am selben Tag alphabetisch – mit fertig berechnetem Countdown */
export function examViews(data: AppData, today: IsoDate): ExamView[] {
  return [...data.exams]
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.titel.localeCompare(b.titel, 'de'))
    .map((exam) => {
      const tageBis = daysBetween(today, exam.datum)
      return { exam, tageBis, vorbei: tageBis < 0 }
    })
}

export function examsForDay(data: AppData, day: IsoDate): Exam[] {
  return data.exams
    .filter((e) => e.datum === day)
    .sort((a, b) => a.titel.localeCompare(b.titel, 'de'))
}
