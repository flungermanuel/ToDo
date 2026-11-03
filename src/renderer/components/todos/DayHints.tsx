import { GraduationCap } from 'lucide-react'
import type { DeadlineView } from '@core/index'
import type { Exam } from '@shared/types'
import { cn } from '@renderer/lib/utils'

interface DayHintsProps {
  exams: Exam[]
  deadlines: DeadlineView[]
  className?: string
}

// Termine eines Tages als dezente Zeilen über den Todos:
// zuerst Prüfungen (🎓, lila), dann Deadlines ("!", orange bzw. rot wenn überfällig).
export function DayHints({ exams, deadlines, className }: DayHintsProps) {
  if (exams.length === 0 && deadlines.length === 0) return null
  return (
    <ul className={cn('flex flex-col gap-0.5', className)}>
      {exams.map((exam) => (
        <li key={exam.id} className="flex items-center gap-2 text-xs font-medium text-exam">
          <GraduationCap className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            <span className="sr-only">Prüfung: </span>
            {exam.titel}
          </span>
        </li>
      ))}
      {deadlines.map(({ deadline, erledigt, ueberfaellig }) => (
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
