import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { CalendarDays } from 'lucide-react'
import { addDays, daysBetween, examViews } from '@core/index'
import type { AppData, IsoDate } from '@shared/types'
import { examActions } from '@renderer/state/actions'
import { formatShortDate, relativeDays, useToday } from '@renderer/lib/dates'
import { Widget } from '@renderer/components/Widget'
import { AddRow } from '@renderer/components/ui/AddRow'
import { DatePill } from '@renderer/components/ui/DatePill'
import { ExamItem } from './ExamItem'

interface ExamWidgetProps {
  data: AppData
}

// Prüfungen mit Countdown, nach Datum sortiert. Vergangene sind ausgeblendet,
// die nächste anstehende ist leicht hervorgehoben.
export function ExamWidget({ data }: ExamWidgetProps) {
  const today = useToday()
  const [showPast, setShowPast] = useState(false)
  const views = examViews(data, today)
  const past = views.filter((v) => v.vorbei).length
  const visible = showPast ? views : views.filter((v) => !v.vorbei)
  const nextId = views.find((v) => !v.vorbei)?.exam.id

  return (
    <Widget title="Prüfungen">
      <NewExamRow today={today} />

      {views.length === 0 && (
        <div className="px-3 py-4 text-center">
          <p className="text-fg-muted">Keine Prüfungen.</p>
          <p className="mt-1 text-xs text-fg-subtle">Fach eingeben, Datum wählen, Enter.</p>
        </div>
      )}

      {/* Vergangene stehen chronologisch ganz oben – dort klappen sie auch auf */}
      {past > 0 && (
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          aria-expanded={showPast}
          className="w-full rounded-lg px-3 py-1 pl-[42px] text-left text-xs text-fg-subtle hover:bg-hover hover:text-fg-muted"
        >
          {showPast ? 'Vergangene ausblenden' : `${past} vergangene anzeigen`}
        </button>
      )}

      <ul>
        <AnimatePresence initial={false}>
          {visible.map((view) => (
            <ExamItem key={view.exam.id} view={view} isNext={view.exam.id === nextId} />
          ))}
        </AnimatePresence>
      </ul>
    </Widget>
  )
}

// Prüfungen plant man meist weiter im Voraus als Deadlines – deshalb in 14 Tagen als Vorschlag
const DEFAULT_DAYS_AHEAD = 14

function NewExamRow({ today }: { today: IsoDate }) {
  const [datum, setDatum] = useState<IsoDate>(() => addDays(today, DEFAULT_DAYS_AHEAD))

  return (
    <AddRow
      placeholder="Neue Prüfung"
      onAdd={(titel) => {
        examActions.add({ titel, datum })
        setDatum(addDays(today, DEFAULT_DAYS_AHEAD))
      }}
    >
      <DatePill value={datum} onChange={setDatum} label="Prüfungsdatum">
        <CalendarDays className="size-3.5" />
        <span className="tabular-nums">
          {relativeDays(daysBetween(today, datum))} · {formatShortDate(datum)}
        </span>
      </DatePill>
    </AddRow>
  )
}
