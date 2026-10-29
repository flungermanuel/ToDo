import { deadlineViews } from '@core/index'
import type { AppData } from '@shared/types'
import { useView } from '@renderer/state/viewStore'
import { dayLabel, formatLongDate, isRelativeDay, useToday } from '@renderer/lib/dates'
import { Widget } from '@renderer/components/Widget'
import { DayView } from './DayView'
import type { ListContext } from './listContext'
import { ViewNavigation } from './ViewNavigation'

interface TodoWidgetProps {
  data: AppData
}

export function TodoWidget({ data }: TodoWidgetProps) {
  const today = useToday()
  const view = useView()

  const list: ListContext = {
    deadlines: deadlineViews(data, today),
    todoTitles: new Map(data.todos.map((t) => [t.id, t.titel])),
    categories: data.categories
  }

  // "Heute · Donnerstag, 29. Oktober" bzw. nur "Dienstag, 3. November"
  const relative = isRelativeDay(view.day, today) ? dayLabel(view.day, today) : null

  return (
    <Widget
      title={
        <span className="flex items-baseline gap-2">
          {relative ?? formatLongDate(view.day)}
          {relative && (
            <span className="text-[13px] font-normal text-fg-muted">
              {formatLongDate(view.day)}
            </span>
          )}
        </span>
      }
      meta={<ViewNavigation unit="Tag" isCurrent={view.day === today} />}
    >
      <DayView data={data} day={view.day} list={list} />
    </Widget>
  )
}
