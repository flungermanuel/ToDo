import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, ListTree, Trash2 } from 'lucide-react'
import { subtaskProgress } from '@core/index'
import type { Todo } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { cn } from '@renderer/lib/utils'
import { Checkbox } from '@renderer/components/ui/Checkbox'
import { EditableText } from '@renderer/components/ui/EditableText'
import { IconButton } from '@renderer/components/ui/IconButton'
import { PriorityPicker } from '@renderer/components/ui/PriorityPicker'
import { SubtaskList } from './SubtaskList'

interface TodoItemProps {
  todo: Todo
}

// So lange bleibt ein frisch abgehaktes Todo stehen, bevor es zu "Erledigt" wandert
const DONE_DELAY_MS = 450

export function TodoItem({ todo }: TodoItemProps) {
  const [justChecked, setJustChecked] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const checked = todo.erledigt || justChecked
  const progress = subtaskProgress(todo)

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
      animate={{ opacity: 1, y: 0 }}
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
          {progress.gesamt > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 self-start text-[11px] text-fg-muted tabular-nums hover:text-fg"
            >
              {progress.erledigt}/{progress.gesamt} Unteraufgaben
            </button>
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
