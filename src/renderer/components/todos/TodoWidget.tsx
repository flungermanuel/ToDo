import { deadlineViews, isoWeek, weekDays } from '@core/index'
import type { AppData } from '@shared/types'
import { useView, viewActions, type ViewMode } from '@renderer/state/viewStore'
import { dayLabel, formatLongDate, formatRange, isRelativeDay, useToday } from '@renderer/lib/dates'
import { Widget } from '@renderer/components/Widget'
import { Segmented } from '@renderer/components/ui/Segmented'
import { DayView } from './DayView'
import type { ListContext } from './listContext'
import { ViewNavigation } from './ViewNavigation'
import { WeekView } from './WeekView'

interface TodoWidgetProps {
  data: AppData
}

const MODES = [
  { value: 'tag', label: 'Tag' },
  { value: 'woche', label: 'Woche' }
] as const satisfies readonly { value: ViewMode; label: string }[]

export function TodoWidget({ data }: TodoWidgetProps) {
  const today = useToday()
  const view = useView()

  const list: ListContext = {
    deadlines: deadlineViews(data, today),
    todoTitles: new Map(data.todos.map((t) => [t.id, t.titel])),
    categories: data.categories
  }

  const week = weekDays(view.day)
  const isCurrent = view.mode === 'tag' ? view.day === today : week.includes(today)

  return (
    <Widget
      title={
        <span className="flex items-center gap-3">
          <Segmented
            label="Ansicht"
            options={MODES}
            value={view.mode}
            onChange={viewActions.setMode}
          />
          {view.mode === 'tag' ? (
            <DayTitle day={view.day} today={today} />
          ) : (
            <span className="flex items-baseline gap-2">
              KW {isoWeek(view.day)}
              <span className="text-[13px] font-normal text-fg-muted">
                {formatRange(week[0]!, week[6]!)}
              </span>
            </span>
          )}
        </span>
      }
      meta={<ViewNavigation unit={view.mode === 'tag' ? 'Tag' : 'Woche'} isCurrent={isCurrent} />}
    >
      {view.mode === 'tag' ? (
        <DayView data={data} day={view.day} list={list} />
      ) : (
        <WeekView data={data} day={view.day} list={list} />
      )}
    </Widget>
  )
}

// "Heute · Donnerstag, 29. Oktober" bzw. nur "Dienstag, 3. November"
function DayTitle({ day, today }: { day: string; today: string }) {
  const relative = isRelativeDay(day, today) ? dayLabel(day, today) : null
  return (
    <span className="flex items-baseline gap-2">
      {relative ?? formatLongDate(day)}
      {relative && (
        <span className="text-[13px] font-normal text-fg-muted">{formatLongDate(day)}</span>
      )}
    </span>
  )
}
