import { useRef, type ReactNode } from 'react'
import { CalendarDays } from 'lucide-react'
import type { IsoDate } from '@shared/types'
import { cn } from '@renderer/lib/utils'

interface DatePillProps {
  /** undefined = noch kein Datum */
  value: IsoDate | undefined
  onChange: (value: IsoDate) => void
  /** "Löschen" in der Datumsauswahl – ohne diese Funktion lässt sich das Datum nicht entfernen */
  onClear?: () => void
  /** Was im Knopf steht – Standard: Kalendersymbol + Datum */
  children?: ReactNode
  className?: string
  label?: string
}

// Kompakter Datums-Knopf. Öffnet die eingebaute Datumsauswahl von Chromium,
// ohne das hässliche Standard-Eingabefeld zu zeigen.
export function DatePill({
  value,
  onChange,
  onClear,
  children,
  className,
  label = 'Datum'
}: DatePillProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`${label} ändern`}
        onClick={() => inputRef.current?.showPicker()}
        className={cn(
          'inline-flex items-center gap-1 rounded-md whitespace-nowrap px-1.5 py-0.5 text-xs text-fg-muted hover:bg-active hover:text-fg',
          className
        )}
      >
        {children ?? (
          <>
            <CalendarDays className="size-3.5" />
            {value}
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value ?? ''}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value)
          else onClear?.()
        }}
        // Unsichtbar, dient nur als Anker für die Datumsauswahl
        className="pointer-events-none absolute inset-0 opacity-0"
      />
    </span>
  )
}
