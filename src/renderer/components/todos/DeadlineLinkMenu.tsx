import { CalendarClock, Unlink } from 'lucide-react'
import type { DeadlineView } from '@core/index'
import type { Todo } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { formatShortDate, relativeDays } from '@renderer/lib/dates'
import { cn } from '@renderer/lib/utils'
import {
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger
} from '@renderer/components/ui/Menu'

interface DeadlineLinkMenuProps {
  todo: Todo
  deadlines: DeadlineView[]
  /** Titel der Todos, um "schon verknüpft mit …" anzuzeigen */
  todoTitles: Map<string, string>
}

// Menü am Todo: eine Deadline auswählen oder die Verknüpfung lösen.
export function DeadlineLinkMenu({ todo, deadlines, todoTitles }: DeadlineLinkMenuProps) {
  const linked = todo.deadlineId !== undefined

  return (
    <MenuRoot>
      <MenuTrigger
        aria-label={linked ? 'Verknüpfte Deadline ändern' : 'Mit Deadline verknüpfen'}
        title={linked ? 'Verknüpfte Deadline ändern' : 'Mit Deadline verknüpfen'}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-md outline-none transition-colors',
          'hover:bg-active focus-visible:bg-active data-[state=open]:bg-active data-[state=open]:opacity-100 [&>svg]:size-3.5',
          // Die Verknüpfung steht schon unter dem Titel – das Symbol braucht es nur beim Hovern
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          linked ? 'text-accent' : 'text-fg-subtle hover:text-fg'
        )}
      >
        <CalendarClock />
      </MenuTrigger>

      <MenuContent className="w-64">
        <MenuLabel>Mit Deadline verknüpfen</MenuLabel>

        {deadlines.length === 0 ? (
          <MenuItem disabled>Noch keine Deadlines angelegt</MenuItem>
        ) : (
          <MenuRadioGroup
            value={todo.deadlineId ?? ''}
            onValueChange={(deadlineId) => todoActions.link(todo.id, deadlineId)}
          >
            {deadlines.map(({ deadline, tageBis, verknuepftesTodoId }) => {
              const otherTodo =
                verknuepftesTodoId && verknuepftesTodoId !== todo.id
                  ? todoTitles.get(verknuepftesTodoId)
                  : undefined
              return (
                <MenuRadioItem key={deadline.id} value={deadline.id}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{deadline.titel}</span>
                    <span className="truncate text-[11px] opacity-70">
                      {relativeDays(tageBis)} · {formatShortDate(deadline.datum)}
                      {otherTodo && ` · gehört zu „${otherTodo}“`}
                    </span>
                  </span>
                </MenuRadioItem>
              )
            })}
          </MenuRadioGroup>
        )}

        {linked && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => todoActions.unlink(todo.id)}>
              <Unlink className="size-3.5" />
              Verknüpfung lösen
            </MenuItem>
          </>
        )}
      </MenuContent>
    </MenuRoot>
  )
}
