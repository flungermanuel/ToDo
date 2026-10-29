import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import type { Todo } from '@shared/types'
import { cn } from '@renderer/lib/utils'
import type { ListContext } from './listContext'
import { TodoItem } from './TodoItem'

interface TodoGroupProps {
  title: ReactNode
  todos: Todo[]
  list: ListContext
  /** Farbe der Überschrift, z. B. rot für "Überfällig" */
  tone?: 'default' | 'danger'
  defaultCollapsed?: boolean
}

// Einfache einklappbare Gruppe ohne Kategorie-Menü – für "Überfällig" und "Ohne Datum".
export function TodoGroup({
  title,
  todos,
  list,
  tone = 'default',
  defaultCollapsed = false
}: TodoGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <section className="mt-1">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 rounded-lg py-1.5 pl-3 text-left hover:bg-hover"
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-fg-subtle transition-transform',
            !collapsed && 'rotate-90'
          )}
        />
        <span className={cn('text-[13px] font-semibold', tone === 'danger' && 'text-danger')}>
          {title}
        </span>
        <span className="text-xs text-fg-subtle tabular-nums">{todos.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {todos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} {...list} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
