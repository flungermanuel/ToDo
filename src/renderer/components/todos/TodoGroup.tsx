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

// Lange Gruppen zeigen zuerst nur so viele Todos – jede Zeile ist eine animierte
// Komponente, und Hunderte davon machen das Umschalten und Abhaken spürbar langsam
// (gemessen in docs/performance.md). Der Rest kommt per Klick dazu.
export const GROUP_PREVIEW_LIMIT = 50

// Einfache einklappbare Gruppe ohne Kategorie-Menü – für "Überfällig" und "Ohne Datum".
export function TodoGroup({
  title,
  todos,
  list,
  tone = 'default',
  defaultCollapsed = false
}: TodoGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? todos : todos.slice(0, GROUP_PREVIEW_LIMIT)
  const hidden = todos.length - visible.length

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
              {visible.map((todo) => (
                <TodoItem key={todo.id} todo={todo} {...list} />
              ))}
            </AnimatePresence>
            {todos.length > GROUP_PREVIEW_LIMIT && (
              <li>
                {/* Gleiche Optik wie "N ältere erledigte anzeigen" bei den Deadlines */}
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  aria-expanded={showAll}
                  className="w-full rounded-lg px-3 py-1 pl-[42px] text-left text-xs text-fg-subtle hover:bg-hover hover:text-fg-muted"
                >
                  {showAll ? 'Weniger anzeigen' : `${hidden} weitere anzeigen`}
                </button>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
