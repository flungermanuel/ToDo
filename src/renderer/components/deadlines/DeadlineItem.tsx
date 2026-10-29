import { motion } from 'motion/react'
import { AlertCircle, Link2, Trash2 } from 'lucide-react'
import type { DeadlineView } from '@core/index'
import { deadlineActions } from '@renderer/state/actions'
import { formatShortDate, relativeDays } from '@renderer/lib/dates'
import { cn } from '@renderer/lib/utils'
import { Checkbox } from '@renderer/components/ui/Checkbox'
import { DatePill } from '@renderer/components/ui/DatePill'
import { EditableText } from '@renderer/components/ui/EditableText'
import { IconButton } from '@renderer/components/ui/IconButton'
import { PriorityPicker } from '@renderer/components/ui/PriorityPicker'

interface DeadlineItemProps {
  view: DeadlineView
  /** Titel des verknüpften Todos, falls vorhanden */
  linkedTodoTitle?: string
}

export function DeadlineItem({ view, linkedTodoTitle }: DeadlineItemProps) {
  const { deadline, erledigt, tageBis, ueberfaellig } = view
  const linked = view.verknuepftesTodoId !== undefined
  const heute = !erledigt && tageBis === 0

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-hover"
    >
      <Checkbox
        checked={erledigt}
        tone="success"
        readOnly={linked}
        onChange={() => deadlineActions.toggle(deadline.id)}
        label={`„${deadline.titel}“ abhaken`}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <EditableText
          value={deadline.titel}
          label="Deadline bearbeiten"
          onSave={(titel) => deadlineActions.update(deadline.id, { titel })}
          className={cn(erledigt && 'text-fg-muted')}
        />
        <div className="-ml-1.5 flex items-center gap-1">
          <DatePill
            value={deadline.datum}
            onChange={(datum) => deadlineActions.update(deadline.id, { datum })}
            label="Fälligkeit"
            className={cn(
              'tabular-nums',
              ueberfaellig && 'text-danger hover:text-danger',
              heute && 'text-warning hover:text-warning'
            )}
          >
            {/* Überfällig nicht nur über Farbe zeigen, sondern auch mit Symbol und Text */}
            {ueberfaellig && <AlertCircle className="size-3" strokeWidth={2.5} />}
            <span className={cn((ueberfaellig || heute) && 'font-medium')}>
              {ueberfaellig ? `Überfällig · ${relativeDays(tageBis)}` : relativeDays(tageBis)}
            </span>
            <span className="text-fg-subtle">· {formatShortDate(deadline.datum)}</span>
          </DatePill>

          {linked && (
            <span
              className="flex min-w-0 items-center gap-1 text-xs text-fg-subtle"
              title={`Verknüpft mit Todo „${linkedTodoTitle ?? ''}“`}
            >
              <Link2 className="size-3 shrink-0" />
              <span className="truncate">{linkedTodoTitle}</span>
            </span>
          )}
        </div>
      </div>

      <PriorityPicker
        value={deadline.prioritaet}
        onChange={(prioritaet) => deadlineActions.update(deadline.id, { prioritaet })}
        muted={erledigt}
      />

      <IconButton
        label="Löschen"
        tone="danger"
        onClick={() => deadlineActions.remove(deadline.id)}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 />
      </IconButton>
    </motion.li>
  )
}
