import { useState } from 'react'
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

interface DeadlineWidgetProps {
  data: AppData
}

export function DeadlineWidget({ data }: DeadlineWidgetProps) {
  const today = useToday()
  const [showArchived, setShowArchived] = useState(false)
  const views = deadlineViews(data, today)
  const overdue = views.filter((v) => v.ueberfaellig).length
  const archived = views.filter(isArchivedDeadline).length
  const visible = showArchived ? views : views.filter((v) => !isArchivedDeadline(v))
  const todoTitles = new Map(data.todos.map((t) => [t.id, t.titel]))

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

      {/* Erledigte bleiben an ihrem Platz in der Zeitleiste – nur mit Haken */}
      <ul>
        <AnimatePresence initial={false}>
          {visible.map((view) => (
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
    </Widget>
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
