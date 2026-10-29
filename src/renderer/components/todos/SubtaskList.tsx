import { X } from 'lucide-react'
import type { Todo } from '@shared/types'
import { todoActions } from '@renderer/state/actions'
import { cn } from '@renderer/lib/utils'
import { AddRow } from '@renderer/components/ui/AddRow'
import { Checkbox } from '@renderer/components/ui/Checkbox'
import { EditableText } from '@renderer/components/ui/EditableText'
import { IconButton } from '@renderer/components/ui/IconButton'

interface SubtaskListProps {
  todo: Todo
}

// Unteraufgaben eines Todos – eingerückt unter dem Titel, nur eine Ebene.
export function SubtaskList({ todo }: SubtaskListProps) {
  return (
    <div className="pb-1 pl-[30px]">
      <ul>
        {todo.unteraufgaben.map((sub) => (
          <li
            key={sub.id}
            className="group/sub flex items-center gap-2.5 rounded-md px-3 py-1 hover:bg-hover"
          >
            <Checkbox
              size="sm"
              checked={sub.erledigt}
              onChange={() => todoActions.toggleSubtask(todo.id, sub.id)}
              label={`„${sub.titel}“ abhaken`}
            />
            <EditableText
              value={sub.titel}
              label="Unteraufgabe bearbeiten"
              onSave={(titel) => todoActions.renameSubtask(todo.id, sub.id, titel)}
              className={cn('flex-1 text-[12.5px]', sub.erledigt && 'text-fg-muted line-through')}
            />
            <IconButton
              label="Unteraufgabe löschen"
              tone="danger"
              onClick={() => todoActions.removeSubtask(todo.id, sub.id)}
              className="size-5 opacity-0 group-hover/sub:opacity-100 focus-visible:opacity-100 [&>svg]:size-3"
            >
              <X />
            </IconButton>
          </li>
        ))}
      </ul>
      <AddRow
        placeholder="Unteraufgabe hinzufügen"
        onAdd={(titel) => todoActions.addSubtask(todo.id, titel)}
        autoFocus={todo.unteraufgaben.length === 0}
        className="py-1 text-[12.5px] [&>svg]:size-[15px]"
      />
    </div>
  )
}
