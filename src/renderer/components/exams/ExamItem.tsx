import { motion } from 'motion/react'
import { GraduationCap, Trash2 } from 'lucide-react'
import { EXAM_SOON_DAYS, type ExamView } from '@core/index'
import { examActions } from '@renderer/state/actions'
import { formatShortDate, relativeDays } from '@renderer/lib/dates'
import { cn } from '@renderer/lib/utils'
import { DatePill } from '@renderer/components/ui/DatePill'
import { EditableText } from '@renderer/components/ui/EditableText'
import { IconButton } from '@renderer/components/ui/IconButton'

interface ExamItemProps {
  view: ExamView
  /** Die nächste anstehende Prüfung – wird leicht hervorgehoben */
  isNext: boolean
}

// Eine Zeile: Symbol, Fach, Countdown mit Datum. Statt einer Checkbox ein Hut-Symbol,
// denn Prüfungen werden nicht abgehakt – sie sind vorbei, wenn ihr Tag vorbei ist.
export function ExamItem({ view, isNext }: ExamItemProps) {
  const { exam, tageBis, vorbei } = view
  const heute = tageBis === 0
  const bald = !vorbei && !heute && tageBis <= EXAM_SOON_DAYS

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: vorbei ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className={cn(
        'group flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-hover',
        isNext && 'bg-exam/8 hover:bg-exam/12'
      )}
    >
      {/* Gleiche Breite wie eine Checkbox, damit Titel mit den Deadlines fluchten */}
      <span className="flex size-[18px] shrink-0 items-center justify-center">
        <GraduationCap
          className={cn('size-4', vorbei ? 'text-fg-subtle' : 'text-exam')}
          aria-hidden
        />
      </span>

      <EditableText
        value={exam.titel}
        label="Prüfung bearbeiten"
        onSave={(titel) => examActions.update(exam.id, { titel })}
        className={cn('min-w-0 flex-1', isNext && 'font-medium', vorbei && 'text-fg-muted')}
      />

      <DatePill
        value={exam.datum}
        onChange={(datum) => examActions.update(exam.id, { datum })}
        label="Prüfungsdatum"
        className={cn(
          'shrink-0 tabular-nums',
          heute && 'text-danger hover:text-danger',
          bald && 'text-warning hover:text-warning'
        )}
      >
        <span className={cn((heute || bald) && 'font-medium')}>{relativeDays(tageBis)}</span>
        <span className="text-fg-subtle">· {formatShortDate(exam.datum)}</span>
      </DatePill>

      <IconButton
        label="Löschen"
        tone="danger"
        onClick={() => examActions.remove(exam.id)}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 />
      </IconButton>
    </motion.li>
  )
}
