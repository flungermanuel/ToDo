import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addDays,
  addMonths,
  calendarMarkers,
  isoWeek,
  isWeekend,
  monthGrid,
  weekDays,
  type DayMarker
} from '@core/index'
import type { AppData, IsoDate } from '@shared/types'
import { useView } from '@renderer/state/viewStore'
import { toLocalDate, useToday } from '@renderer/lib/dates'
import { cn } from '@renderer/lib/utils'
import { Widget } from '@renderer/components/Widget'
import { Segmented } from '@renderer/components/ui/Segmented'

type CalendarMode = 'woche' | 'monat'

const MODES = [
  { value: 'woche', label: 'Woche' },
  { value: 'monat', label: 'Monat' }
] as const satisfies readonly { value: CalendarMode; label: string }[]

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const monthTitle = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })

interface CalendarWidgetProps {
  data: AppData
}

// Kleiner Kalender unter den Deadlines. Pro Tag ganz dezent:
// · = offene Todos, ! = Deadline (rot überfällig, orange offen, gedimmt erledigt).
export function CalendarWidget({ data }: CalendarWidgetProps) {
  const today = useToday()
  const view = useView()
  // Startet in der Wochenansicht (Entscheidung V1.2)
  const [mode, setMode] = useState<CalendarMode>('woche')
  // Welche Woche/welcher Monat angezeigt wird. Folgt dem Tag links – außer man hat selbst
  // geblättert. Wechselt danach links der Tag, gilt wieder der Tag links.
  const [anchor, setAnchor] = useState<{ day: IsoDate; base: IsoDate } | null>(null)
  const shown = anchor && anchor.base === view.day ? anchor.day : view.day

  const rows = mode === 'woche' ? [weekDays(shown)] : monthGridFor(shown)
  const markers = calendarMarkers(data, rows.flat(), today)
  const month = shown.slice(0, 7)

  function step(direction: 1 | -1) {
    const day = mode === 'woche' ? addDays(shown, 7 * direction) : addMonths(shown, direction)
    setAnchor({ day, base: view.day })
  }

  return (
    <Widget
      className="shrink-0"
      title={
        <span className="flex items-baseline gap-2">
          {monthTitle.format(toLocalDate(mode === 'woche' ? weekDays(shown)[3]! : shown))}
          {mode === 'woche' && (
            <span className="text-[13px] font-normal text-fg-muted">KW {isoWeek(shown)}</span>
          )}
        </span>
      }
      meta={
        <span className="flex items-center gap-2">
          <Segmented
            size="sm"
            label="Kalenderansicht"
            options={MODES}
            value={mode}
            onChange={setMode}
          />
          <span className="flex items-center">
            <StepButton label="Zurück" onClick={() => step(-1)}>
              <ChevronLeft className="size-3.5" />
            </StepButton>
            <StepButton label="Weiter" onClick={() => step(1)}>
              <ChevronRight className="size-3.5" />
            </StepButton>
          </span>
        </span>
      }
    >
      <div className="px-3 pb-2" role="grid" aria-label="Kalender">
        <div className="grid grid-cols-7 pb-1" role="row">
          {WEEKDAYS.map((d, i) => (
            <span
              key={d}
              role="columnheader"
              className={cn(
                'text-center text-[11px] font-medium',
                i >= 5 ? 'text-weekend-fg' : 'text-fg-subtle'
              )}
            >
              {d}
            </span>
          ))}
        </div>

        {rows.map((week) => (
          <div key={week[0]} className="grid grid-cols-7" role="row">
            {week.map((day) => (
              <DayCell
                key={day}
                day={day}
                marker={markers.get(day)!}
                today={today}
                selected={day === view.day}
                outside={mode === 'monat' && day.slice(0, 7) !== month}
              />
            ))}
          </div>
        ))}
      </div>
    </Widget>
  )
}

interface DayCellProps {
  day: IsoDate
  marker: DayMarker
  today: IsoDate
  selected: boolean
  /** Tag aus dem Vor-/Folgemonat im Monatsraster */
  outside: boolean
}

function DayCell({ day, marker, today, selected, outside }: DayCellProps) {
  const isToday = day === today
  const weekend = isWeekend(day)

  return (
    <div role="gridcell" className="flex flex-col items-center">
      <span
        className={cn(
          'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
          selected
            ? 'bg-accent font-semibold text-white'
            : isToday
              ? 'font-semibold text-accent ring-1 ring-accent'
              : weekend
                ? 'text-weekend-fg'
                : 'text-fg',
          outside && !selected && 'opacity-35'
        )}
        aria-current={isToday ? 'date' : undefined}
      >
        {Number(day.slice(8))}
      </span>
      {/* Markierungen: feste Höhe, damit alle Zeilen gleich hoch sind */}
      <span className={cn('flex h-2.5 items-center gap-0.5', outside && 'opacity-35')} aria-hidden>
        {marker.offeneTodos > 0 && <span className="size-1 rounded-full bg-fg-muted" />}
        {marker.deadline !== 'keine' && (
          <span
            className={cn(
              'text-[10px] leading-none font-bold',
              marker.deadline === 'ueberfaellig' && 'text-danger',
              marker.deadline === 'offen' && 'text-warning',
              marker.deadline === 'erledigt' && 'text-fg-subtle'
            )}
          >
            !
          </span>
        )}
      </span>
      <span className="sr-only">{describe(marker)}</span>
    </div>
  )
}

function StepButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-active hover:text-fg"
    >
      {children}
    </button>
  )
}

// --- Hilfsfunktionen ---

function monthGridFor(day: IsoDate): IsoDate[][] {
  return monthGrid(Number(day.slice(0, 4)), Number(day.slice(5, 7)))
}

function describe(marker: DayMarker): string {
  const parts: string[] = []
  if (marker.offeneTodos > 0) parts.push(`${marker.offeneTodos} offene Todos`)
  if (marker.deadline === 'ueberfaellig') parts.push('überfällige Deadline')
  if (marker.deadline === 'offen') parts.push('Deadline')
  if (marker.deadline === 'erledigt') parts.push('erledigte Deadline')
  return parts.join(', ')
}
