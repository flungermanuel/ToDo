import { deadlineViews, groupTodosByCategory } from '@core/index'
import type { AppData } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { useCollapsedCategories } from '@renderer/state/useCollapsedCategories'
import { useToday } from '@renderer/lib/dates'
import { Widget } from '@renderer/components/Widget'
import { AddRow } from '@renderer/components/ui/AddRow'
import { CategorySection } from './CategorySection'

interface TodoWidgetProps {
  data: AppData
}

export function TodoWidget({ data }: TodoWidgetProps) {
  const today = useToday()
  const deadlines = deadlineViews(data, today)
  const todoTitles = new Map(data.todos.map((t) => [t.id, t.titel]))
  const groups = groupTodosByCategory(data)
  const offen = groups.reduce((sum, g) => sum + g.offen.length, 0)
  const collapsed = useCollapsedCategories()

  return (
    <Widget title="Todos" meta={offen > 0 ? `${offen} offen` : undefined}>
      <AddRow placeholder="Neues Todo" onAdd={(titel) => todoActions.add({ titel })} autoFocus />

      {data.todos.length === 0 && (
        <p className="px-3 pt-1 pb-3 text-xs text-fg-subtle">
          Tippe oben ein Todo ein und drücke Enter.
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
              deadlines={deadlines}
              todoTitles={todoTitles}
            />
          )
        })}
      </div>
    </Widget>
  )
}
