import { motion } from 'motion/react'
import type { DayProgress } from '@core/index'
import { cn } from '@renderer/lib/utils'

// Schmaler Balken unter der Kopfzeile: wie viele Todos des Tages erledigt sind.
// Sind alle erledigt, wird er grün.
export function DayProgressBar({ erledigt, gesamt }: DayProgress) {
  const fertig = erledigt === gesamt

  return (
    <div className="flex items-center gap-3 px-5 pb-2">
      <div
        role="progressbar"
        aria-label="Fortschritt des Tages"
        aria-valuemin={0}
        aria-valuemax={gesamt}
        aria-valuenow={erledigt}
        className="h-[3px] flex-1 overflow-hidden rounded-full bg-active"
      >
        <motion.div
          className={cn('h-full rounded-full', fertig ? 'bg-success' : 'bg-accent')}
          initial={false}
          animate={{ width: `${(erledigt / gesamt) * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        />
      </div>
      <span
        className={cn(
          'text-[11px] text-fg-muted tabular-nums',
          fertig && 'font-medium text-success'
        )}
      >
        {erledigt}/{gesamt}
      </span>
    </div>
  )
}
