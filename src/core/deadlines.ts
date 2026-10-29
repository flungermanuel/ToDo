import {
  DEFAULT_PRIORITY,
  type AppData,
  type Deadline,
  type IsoDate,
  type Priority
} from '@shared/types'
import { defaultContext, type CoreContext } from './context'
import { daysBetween, isValidIsoDate } from './dates'
import { findLinkedTodo, isDeadlineDone } from './links'
import { cleanTitle } from './text'
import { withoutDeadline } from './todos'

export interface NewDeadline {
  titel: string
  datum: IsoDate
  prioritaet?: Priority
}

export function createDeadline(
  data: AppData,
  input: NewDeadline,
  ctx: CoreContext = defaultContext
): AppData {
  const titel = cleanTitle(input.titel)
  if (!titel || !isValidIsoDate(input.datum)) return data

  const deadline: Deadline = {
    id: ctx.newId(),
    titel,
    datum: input.datum,
    erledigt: false,
    prioritaet: input.prioritaet ?? DEFAULT_PRIORITY
  }
  return { ...data, deadlines: [...data.deadlines, deadline] }
}

export interface DeadlinePatch {
  titel?: string
  datum?: IsoDate
  prioritaet?: Priority
}

export function updateDeadline(data: AppData, id: string, patch: DeadlinePatch): AppData {
  return mapDeadline(data, id, (deadline) => {
    const next = { ...deadline }
    if (patch.titel !== undefined) {
      const titel = cleanTitle(patch.titel)
      if (titel) next.titel = titel
    }
    if (patch.datum !== undefined && isValidIsoDate(patch.datum)) next.datum = patch.datum
    if (patch.prioritaet !== undefined) next.prioritaet = patch.prioritaet
    return next
  })
}

/** Nur Deadlines ohne verknüpftes Todo können direkt abgehakt werden. */
export function canToggleDeadline(data: AppData, id: string): boolean {
  return data.deadlines.some((d) => d.id === id) && !findLinkedTodo(data, id)
}

export function toggleDeadline(data: AppData, id: string): AppData {
  if (!canToggleDeadline(data, id)) return data
  return mapDeadline(data, id, (d) => ({ ...d, erledigt: !d.erledigt }))
}

export function deleteDeadline(data: AppData, id: string): AppData {
  return {
    ...data,
    deadlines: data.deadlines.filter((d) => d.id !== id),
    // Verknüpfte Todos bleiben, verlieren nur den Verweis
    todos: data.todos.map((t) => (t.deadlineId === id ? withoutDeadline(t) : t))
  }
}

// --- Status & Sortierung ---

export interface DeadlineView {
  deadline: Deadline
  erledigt: boolean
  /** Tage bis zur Fälligkeit: 0 = heute, negativ = überfällig */
  tageBis: number
  ueberfaellig: boolean
  verknuepftesTodoId?: string
}

/** Alles, was die UI über eine Deadline wissen muss – fertig berechnet. */
export function describeDeadline(data: AppData, deadline: Deadline, today: IsoDate): DeadlineView {
  const erledigt = isDeadlineDone(data, deadline)
  const tageBis = daysBetween(today, deadline.datum)
  const view: DeadlineView = {
    deadline,
    erledigt,
    tageBis,
    // Erledigtes ist nie überfällig – es bleibt sichtbar, aber ohne Warnfarbe
    ueberfaellig: !erledigt && tageBis < 0
  }
  const todo = findLinkedTodo(data, deadline.id)
  if (todo) view.verknuepftesTodoId = todo.id
  return view
}

/** Nach Fälligkeit; am selben Tag die höhere Priorität zuerst, dann alphabetisch. */
export function sortDeadlines(deadlines: readonly Deadline[]): Deadline[] {
  return [...deadlines].sort(
    (a, b) =>
      a.datum.localeCompare(b.datum) ||
      b.prioritaet - a.prioritaet ||
      a.titel.localeCompare(b.titel, 'de')
  )
}

/** Fertige, sortierte Liste für das Deadline-Widget. */
export function deadlineViews(data: AppData, today: IsoDate): DeadlineView[] {
  return sortDeadlines(data.deadlines).map((d) => describeDeadline(data, d, today))
}

function mapDeadline(data: AppData, id: string, fn: (d: Deadline) => Deadline): AppData {
  if (!data.deadlines.some((d) => d.id === id)) return data
  return { ...data, deadlines: data.deadlines.map((d) => (d.id === id ? fn(d) : d)) }
}
