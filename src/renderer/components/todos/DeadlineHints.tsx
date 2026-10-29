import type { DeadlineView } from '@core/index'
import { cn } from '@renderer/lib/utils'

interface DeadlineHintsProps {
  views: DeadlineView[]
  className?: string
}

// Deadlines eines Tages als dezente "!"-Zeilen über den Todos.
export function DeadlineHints({ views, className }: DeadlineHintsProps) {
  if (views.length === 0) return null
  return (
    <ul className={cn('flex flex-col gap-0.5', className)}>
      {views.map(({ deadline, erledigt, ueberfaellig }) => (
        <li
          key={deadline.id}
          className={cn(
            'flex items-center gap-2 text-xs',
            erledigt ? 'text-fg-subtle line-through' : ueberfaellig ? 'text-danger' : 'text-warning'
          )}
        >
          <span className="w-3 text-center font-bold" aria-hidden>
            {erledigt ? '✓' : '!'}
          </span>
          <span className="truncate">
            <span className="sr-only">Deadline: </span>
            {deadline.titel}
          </span>
        </li>
      ))}
    </ul>
  )
}
