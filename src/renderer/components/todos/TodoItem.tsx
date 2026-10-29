import { useState } from 'react'
import { motion } from 'motion/react'
import { Trash2 } from 'lucide-react'
import type { Todo } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { cn } from '@renderer/lib/utils'
import { Checkbox } from '@renderer/components/ui/Checkbox'
import { EditableText } from '@renderer/components/ui/EditableText'
import { IconButton } from '@renderer/components/ui/IconButton'

interface TodoItemProps {
  todo: Todo
}

// So lange bleibt ein frisch abgehaktes Todo stehen, bevor es zu "Erledigt" wandert
const DONE_DELAY_MS = 450

export function TodoItem({ todo }: TodoItemProps) {
  const [justChecked, setJustChecked] = useState(false)
  const checked = todo.erledigt || justChecked

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
      className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-hover"
    >
      <Checkbox checked={checked} onChange={handleToggle} label={`„${todo.titel}“ abhaken`} />

      <EditableText
        value={todo.titel}
        label="Todo bearbeiten"
        onSave={(titel) => todoActions.update(todo.id, { titel })}
        className={cn(
          'flex-1 transition-colors',
          checked && 'text-fg-muted line-through decoration-fg-subtle'
        )}
      />

      <IconButton
        label="Löschen"
        tone="danger"
        onClick={() => todoActions.remove(todo.id)}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 />
      </IconButton>
    </motion.li>
  )
}
