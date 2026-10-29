import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { sortTodos } from '@core/index'
import type { Todo } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { cn } from '@renderer/lib/utils'
import { Widget } from '@renderer/components/Widget'
import { AddRow } from '@renderer/components/ui/AddRow'
import { TodoItem } from './TodoItem'

interface TodoWidgetProps {
  todos: Todo[]
}

export function TodoWidget({ todos }: TodoWidgetProps) {
  const [showDone, setShowDone] = useState(false)

  const sorted = sortTodos(todos)
  const open = sorted.filter((t) => !t.erledigt)
  const done = sorted.filter((t) => t.erledigt)

  return (
    <Widget title="Todos" meta={open.length > 0 ? `${open.length} offen` : undefined}>
      <AddRow placeholder="Neues Todo" onAdd={(titel) => todoActions.add({ titel })} autoFocus />

      {open.length === 0 && done.length === 0 && (
        <EmptyState text="Nichts zu tun." hint="Tippe oben ein Todo ein und drücke Enter." />
      )}
      {open.length === 0 && done.length > 0 && <EmptyState text="Alles erledigt 🎉" />}

      <ul>
        <AnimatePresence initial={false}>
          {open.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </AnimatePresence>
      </ul>

      {done.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg"
          >
            <ChevronRight
              className={cn('size-3.5 transition-transform', showDone && 'rotate-90')}
            />
            Erledigt
            <span className="tabular-nums text-fg-subtle">{done.length}</span>
          </button>
          {showDone && (
            <ul>
              <AnimatePresence initial={false}>
                {done.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </Widget>
  )
}

function EmptyState({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="px-3 py-8 text-center">
      <p className="text-fg-muted">{text}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  )
}
