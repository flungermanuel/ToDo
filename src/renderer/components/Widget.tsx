import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/utils'

interface WidgetProps {
  title: ReactNode
  // Kleine Zusatzinfo rechts neben dem Titel, z. B. "3 offen"
  meta?: ReactNode
  className?: string
  children: ReactNode
}

// Gemeinsamer Rahmen für Todo- und Deadline-Widget: Karte mit Kopfzeile.
export function Widget({ title, meta, className, children }: WidgetProps) {
  return (
    <section className={cn('flex min-h-0 flex-col rounded-card bg-surface shadow-card', className)}>
      <header className="flex min-h-8 items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {meta && <span className="text-xs text-fg-muted tabular-nums">{meta}</span>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">{children}</div>
    </section>
  )
}
