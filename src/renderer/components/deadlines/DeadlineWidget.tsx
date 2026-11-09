import { useState, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import { CalendarDays } from 'lucide-react'
import { addDays, daysBetween, deadlineViews, isArchivedDeadline } from '@core/index'
import type { AppData, IsoDate } from '@shared/types'
import { deadlineActions } from '@renderer/state/actions'
import { formatShortDate, relativeDays, useToday } from '@renderer/lib/dates'
import { Widget } from '@renderer/components/Widget'
import { AddRow } from '@renderer/components/ui/AddRow'
import { DatePill } from '@renderer/components/ui/DatePill'
import { DeadlineItem } from './DeadlineItem'

// Bei sehr vielen Deadlines nur ein Fenster um heute zeigen: die letzten vor heute und
// die nächsten ab heute. Jede Zeile ist eine animierte Komponente – Hunderte davon
// bremsen jede Änderung spürbar (gemessen in docs/performance.md).
const PREVIEW_LIMIT = 50

interface DeadlineWidgetProps {
  data: AppData
}

export function DeadlineWidget({ data }: DeadlineWidgetProps) {
  const today = useToday()
  const [showArchived, setShowArchived] = useState(false)
  const [showAllPast, setShowAllPast] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const views = deadlineViews(data, today)
  const overdue = views.filter((v) => v.ueberfaellig).length
  const archived = views.filter(isArchivedDeadline).length
  const visible = showArchived ? views : views.filter((v) => !isArchivedDeadline(v))
  const todoTitles = new Map(data.todos.map((t) => [t.id, t.titel]))

  // Die Liste ist nach Datum sortiert: alles vor heute, dann ab heute
  const firstUpcoming = visible.findIndex((v) => v.deadline.datum >= today)
  const split = firstUpcoming === -1 ? visible.length : firstUpcoming
  const past = visible.slice(0, split)
  const upcoming = visible.slice(split)
  const shownPast = showAllPast ? past : past.slice(-PREVIEW_LIMIT)
  const shownUpcoming = showAllUpcoming ? upcoming : upcoming.slice(0, PREVIEW_LIMIT)
  const hiddenPast = past.length - shownPast.length
  const hiddenUpcoming = upcoming.length - shownUpcoming.length

  return (
    // Kein flex-1: Das Widget ist nur so hoch wie sein Inhalt (höchstens bis zum Kalender,
    // dann scrollt es). So bleibt bei wenigen Deadlines kein leerer Kasten stehen.
    <Widget
      title="Deadlines"
      meta={overdue > 0 ? <span className="text-danger">{overdue} überfällig</span> : undefined}
    >
      <NewDeadlineRow today={today} />

      {views.length === 0 && (
        <div className="px-3 py-4 text-center">
          <p className="text-fg-muted">Keine Deadlines.</p>
          <p className="mt-1 text-xs text-fg-subtle">Titel eingeben, Datum wählen, Enter.</p>
        </div>
      )}

      {/* Ältere erledigte stehen chronologisch ganz oben – dort klappen sie auch auf */}
      {archived > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          aria-expanded={showArchived}
          className="w-full rounded-lg px-3 py-1 pl-[42px] text-left text-xs text-fg-subtle hover:bg-hover hover:text-fg-muted"
        >
          {showArchived ? 'Ältere erledigte ausblenden' : `${archived} ältere erledigte anzeigen`}
        </button>
      )}

      {hiddenPast > 0 && (
        <ShowMoreButton onClick={() => setShowAllPast(true)}>
          {hiddenPast} frühere anzeigen
        </ShowMoreButton>
      )}

      {/* Erledigte bleiben an ihrem Platz in der Zeitleiste – nur mit Haken */}
      <ul>
        <AnimatePresence initial={false}>
          {[...shownPast, ...shownUpcoming].map((view) => (
            <DeadlineItem
              key={view.deadline.id}
              view={view}
              linkedTodoTitle={
                view.verknuepftesTodoId ? todoTitles.get(view.verknuepftesTodoId) : undefined
              }
            />
          ))}
        </AnimatePresence>
      </ul>

      {hiddenUpcoming > 0 && (
        <ShowMoreButton onClick={() => setShowAllUpcoming(true)}>
          {hiddenUpcoming} spätere anzeigen
        </ShowMoreButton>
      )}
    </Widget>
  )
}

function ShowMoreButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg px-3 py-1 pl-[42px] text-left text-xs text-fg-subtle hover:bg-hover hover:text-fg-muted"
    >
      {children}
    </button>
  )
}

function NewDeadlineRow({ today }: { today: IsoDate }) {
  const [datum, setDatum] = useState<IsoDate>(() => addDays(today, 1))

  return (
    <AddRow
      placeholder="Neue Deadline"
      onAdd={(titel) => {
        deadlineActions.add({ titel, datum })
        setDatum(addDays(today, 1))
      }}
    >
      <DatePill value={datum} onChange={setDatum} label="Fälligkeit">
        <CalendarDays className="size-3.5" />
        <span className="tabular-nums">
          {relativeDays(daysBetween(today, datum))} · {formatShortDate(datum)}
        </span>
      </DatePill>
    </AddRow>
  )
}
