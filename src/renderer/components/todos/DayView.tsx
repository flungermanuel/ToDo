import { groupTodosByCategory, overdueTodos, todosForDay, todosWithoutDate } from '@core/index'
import type { AppData, IsoDate } from '@shared/types'
import { useCollapsedCategories } from '@renderer/state/useCollapsedCategories'
import { useToday } from '@renderer/lib/dates'
import { CategorySection } from './CategorySection'
import { DeadlineHints } from './DeadlineHints'
import type { ListContext } from './listContext'
import { NewTodoForm } from './NewTodoForm'
import { TodoGroup } from './TodoGroup'

interface DayViewProps {
  data: AppData
  day: IsoDate
  list: ListContext
}

// Tagesansicht: Deadlines des Tages, (nur heute) Überfälliges, Todos nach Kategorien,
// und – falls vorhanden – Todos ohne Datum.
export function DayView({ data, day, list }: DayViewProps) {
  const today = useToday()
  const collapsed = useCollapsedCategories()

  const groups = groupTodosByCategory(data, todosForDay(data, day))
  const overdue = day === today ? overdueTodos(data, today) : []
  const withoutDate = todosWithoutDate(data)
  const deadlinesToday = list.deadlines.filter((v) => v.deadline.datum === day)
  const dayList: ListContext = { ...list, contextDay: day }
  const nothing = groups.every((g) => g.offen.length + g.erledigt.length === 0)

  return (
    <>
      <NewTodoForm
        categories={data.categories}
        defaultDate={day}
        onAdded={(categoryId) => collapsed.expand(categoryId)}
      />

      <DeadlineHints views={deadlinesToday} className="mb-2 px-3 pl-[42px]" />

      {overdue.length > 0 && (
        <TodoGroup title="Überfällig" tone="danger" todos={overdue} list={list} />
      )}

      {nothing && overdue.length === 0 && (
        <p className="px-3 pb-2 pl-[42px] text-xs text-fg-subtle">
          {day === today ? 'Für heute ist nichts geplant.' : 'An diesem Tag ist nichts geplant.'}
        </p>
      )}

      <div className="mt-1">
        {groups.map((group) => {
          const isCollapsed = collapsed.isCollapsed(group.category.id, group.offen.length > 0)
          return (
            <CategorySection
              key={group.category.id}
              group={group}
              collapsed={isCollapsed}
              onToggle={() => collapsed.toggle(group.category.id, isCollapsed)}
              list={dayList}
            />
          )
        })}
      </div>

      {withoutDate.length > 0 && (
        <TodoGroup title="Ohne Datum" todos={withoutDate} list={list} defaultCollapsed />
      )}
    </>
  )
}
