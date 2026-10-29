import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, ChevronRight, ListTree, Trash2 } from 'lucide-react'
import { subtaskProgress, type DeadlineView } from '@core/index'
import type { Category, Todo } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { relativeDays } from '@renderer/lib/dates'
import { cn } from '@renderer/lib/utils'
import { Checkbox } from '@renderer/components/ui/Checkbox'
import { EditableText } from '@renderer/components/ui/EditableText'
import { IconButton } from '@renderer/components/ui/IconButton'
import { PriorityPicker } from '@renderer/components/ui/PriorityPicker'
import { DeadlineLinkMenu } from './DeadlineLinkMenu'
import { MoveToCategoryMenu } from './MoveToCategoryMenu'
import { SubtaskList } from './SubtaskList'

interface TodoItemProps {
  todo: Todo
  /** Alle Deadlines (für das Verknüpfungs-Menü) */
  deadlines: DeadlineView[]
  todoTitles: Map<string, string>
  categories: Category[]
}

// So lange bleibt ein frisch abgehaktes Todo stehen, bevor es zu "Erledigt" wandert
const DONE_DELAY_MS = 450

export function TodoItem({ todo, deadlines, todoTitles, categories }: TodoItemProps) {
  const [justChecked, setJustChecked] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const checked = todo.erledigt || justChecked
  const progress = subtaskProgress(todo)
  const linked = deadlines.find((v) => v.deadline.id === todo.deadlineId)

  function handleToggle() {
    if (todo.erledigt) {
      todoActions.toggle(todo.id)
      return
    }
    if (justChecked) return
    setJustChecked(true)
    setTimeout(() => todoActions.toggle(todo.id), DONE_DELAY_MS)
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      // Erledigte stehen ausgegraut am Ende ihrer Kategorie. Die Deckkraft steuert Motion
      // (nicht CSS), weil Motion sie sonst beim Einblenden als Inline-Style überschreibt.
      animate={{ opacity: todo.erledigt ? 0.55 : 1, y: 0 }}
      whileHover={todo.erledigt ? { opacity: 1 } : undefined}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className={cn('rounded-lg', expanded && 'bg-hover')}
    >
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2',
          !expanded && 'hover:bg-hover'
        )}
      >
        <Checkbox checked={checked} onChange={handleToggle} label={`„${todo.titel}“ abhaken`} />

        <div className="flex min-w-0 flex-1 flex-col">
          <EditableText
            value={todo.titel}
            label="Todo bearbeiten"
            onSave={(titel) => todoActions.update(todo.id, { titel })}
            className={cn(
              'transition-colors',
              checked && 'text-fg-muted line-through decoration-fg-subtle'
            )}
          />
          {(progress.gesamt > 0 || linked) && (
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px]">
              {linked && <LinkedDeadline view={linked} />}
              {progress.gesamt > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="shrink-0 text-fg-muted tabular-nums hover:text-fg"
                >
                  {progress.erledigt}/{progress.gesamt} Unteraufgaben
                </button>
              )}
            </div>
          )}
        </div>

        <IconButton
          label={expanded ? 'Unteraufgaben ausblenden' : 'Unteraufgaben'}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={cn(!expanded && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
        >
          {progress.gesamt > 0 ? (
            <ChevronRight className={cn('transition-transform', expanded && 'rotate-90')} />
          ) : (
            <ListTree />
          )}
        </IconButton>

        <DeadlineLinkMenu todo={todo} deadlines={deadlines} todoTitles={todoTitles} />
        {categories.length > 1 && <MoveToCategoryMenu todo={todo} categories={categories} />}

        <PriorityPicker
          value={todo.prioritaet}
          onChange={(p) => todoActions.setPriority(todo.id, p)}
          muted={checked}
        />

        <IconButton
          label="Löschen"
          tone="danger"
          onClick={() => todoActions.remove(todo.id)}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 />
        </IconButton>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <SubtaskList todo={todo} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

// Kurzinfo zur verknüpften Deadline unter dem Todo-Titel
function LinkedDeadline({ view }: { view: DeadlineView }) {
  const heute = !view.erledigt && view.tageBis === 0
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1 text-fg-muted',
        view.ueberfaellig && 'font-medium text-danger',
        heute && 'font-medium text-warning'
      )}
      title={`Verknüpft mit Deadline „${view.deadline.titel}“`}
    >
      <CalendarClock className="size-3 shrink-0" />
      <span className="truncate">{view.deadline.titel}</span>
      <span className="shrink-0">
        · {view.ueberfaellig ? 'Überfällig' : relativeDays(view.tageBis)}
      </span>
    </span>
  )
}
