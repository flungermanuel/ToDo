import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { isWeekend, overdueTodos, todosForDay, todosWithoutDate, weekDays } from '@core/index'
import type { AppData, IsoDate } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { useLastCategory } from '@renderer/state/useLastCategory'
import { viewActions } from '@renderer/state/viewStore'
import { toLocalDate, useToday } from '@renderer/lib/dates'
import { cn } from '@renderer/lib/utils'
import { AddRow } from '@renderer/components/ui/AddRow'
import { DeadlineHints } from './DeadlineHints'
import type { ListContext } from './listContext'
import { NewTodoForm } from './NewTodoForm'
import { TodoGroup } from './TodoGroup'
import { TodoItem } from './TodoItem'

interface WeekViewProps {
  data: AppData
  /** Irgendein Tag der Woche – bestimmt, welche Woche gezeigt wird */
  day: IsoDate
  list: ListContext
}

const weekdayShort = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric' })

// Wochenansicht: Montag bis Sonntag untereinander. Pro Tag Deadlines und Todos
// (mit Farbpunkt der Kategorie statt Gruppierung – sonst wird es zu verschachtelt).
export function WeekView({ data, day, list }: WeekViewProps) {
  const today = useToday()
  const days = weekDays(day)
  const containsToday = days.includes(today)
  // Vergangene Tage dieser Woche sieht man ohnehin – "Überfällig" zeigt nur, was davor liegt
  const overdue = containsToday ? overdueTodos(data, days[0]!) : []
  const withoutDate = todosWithoutDate(data)
  // Neues Todo oben: heute, falls die Woche heute enthält, sonst Montag
  const defaultDate = containsToday ? today : days[0]!

  return (
    <>
      <NewTodoForm categories={data.categories} defaultDate={defaultDate} />

      {overdue.length > 0 && (
        <TodoGroup
          title="Überfällig"
          tone="danger"
          todos={overdue}
          list={{ ...list, showCategory: true }}
        />
      )}

      <div className="mt-1 flex flex-col gap-1">
        {days.map((d) => (
          <WeekDay key={d} data={data} day={d} today={today} list={list} />
        ))}
      </div>

      {withoutDate.length > 0 && (
        <TodoGroup
          title="Ohne Datum"
          todos={withoutDate}
          list={{ ...list, showCategory: true }}
          defaultCollapsed
        />
      )}
    </>
  )
}

interface WeekDayProps {
  data: AppData
  day: IsoDate
  today: IsoDate
  list: ListContext
}

function WeekDay({ data, day, today, list }: WeekDayProps) {
  const [adding, setAdding] = useState(false)
  const [categoryId] = useLastCategory(data.categories)
  const todos = todosForDay(data, day)
  const deadlines = list.deadlines.filter((v) => v.deadline.datum === day)
  const open = todos.filter((t) => !t.erledigt).length
  const isToday = day === today
  const past = day < today
  const weekend = isWeekend(day)
  const date = toLocalDate(day)

  return (
    <section className={cn('rounded-lg', weekend && 'bg-weekend')}>
      <div className="group/day flex items-center gap-1 pr-2">
        {/* Klick auf den Tag öffnet seine Tagesansicht */}
        <button
          type="button"
          onClick={() => viewActions.openDay(day)}
          title="Tagesansicht öffnen"
          className={cn(
            'flex min-w-0 flex-1 items-baseline gap-2 rounded-lg py-1.5 pl-3 text-left hover:bg-hover',
            past && !isToday && 'opacity-55'
          )}
        >
          <span
            className={cn(
              'w-7 text-[13px] font-semibold',
              isToday ? 'text-accent' : weekend ? 'text-weekend-fg' : 'text-fg'
            )}
          >
            {weekdayShort.format(date)}
          </span>
          <span
            className={cn(
              'text-xs tabular-nums',
              isToday ? 'font-medium text-accent' : 'text-fg-muted'
            )}
          >
            {dayMonth.format(date)}
            {isToday && ' · Heute'}
          </span>
          <span className="text-xs text-fg-subtle tabular-nums">{open > 0 ? open : ''}</span>
        </button>
        <button
          type="button"
          aria-label="Todo für diesen Tag"
          title="Todo für diesen Tag"
          onClick={() => setAdding(true)}
          className="flex size-6 items-center justify-center rounded-md text-fg-subtle opacity-0 transition-colors group-hover/day:opacity-100 hover:bg-active hover:text-fg focus-visible:opacity-100"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <DeadlineHints views={deadlines} className="px-3 pb-1 pl-[42px]" />

      {adding && (
        <AddRow
          placeholder="Neues Todo"
          autoFocus
          className="py-1"
          onAdd={(titel) => {
            todoActions.add({ titel, categoryId, datum: day })
          }}
        >
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-xs text-fg-subtle hover:text-fg"
          >
            Fertig
          </button>
        </AddRow>
      )}

      <ul>
        <AnimatePresence initial={false}>
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} {...list} contextDay={day} showCategory />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}
