import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { viewActions } from '@renderer/state/viewStore'
import { cn } from '@renderer/lib/utils'

interface ViewNavigationProps {
  /** Ist der angezeigte Zeitraum schon "heute"? Dann ist der Heute-Knopf gedimmt */
  isCurrent: boolean
  unit: 'Tag' | 'Woche'
}

// ‹  Heute  › – blättert einen Tag bzw. eine Woche vor/zurück.
export function ViewNavigation({ isCurrent, unit }: ViewNavigationProps) {
  const prev = unit === 'Tag' ? 'Vorheriger Tag' : 'Vorherige Woche'
  const next = unit === 'Tag' ? 'Nächster Tag' : 'Nächste Woche'

  return (
    <div className="flex items-center rounded-md border border-separator">
      <NavButton label={prev} onClick={() => viewActions.step(-1)}>
        <ChevronLeft className="size-3.5" />
      </NavButton>
      <button
        type="button"
        onClick={() => viewActions.today()}
        className={cn(
          'h-6 border-x border-separator px-2 text-xs font-medium transition-colors hover:bg-hover',
          isCurrent ? 'text-fg-subtle' : 'text-fg'
        )}
      >
        Heute
      </button>
      <NavButton label={next} onClick={() => viewActions.step(1)}>
        <ChevronRight className="size-3.5" />
      </NavButton>
    </div>
  )
}

function NavButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center text-fg-muted transition-colors hover:bg-hover hover:text-fg"
    >
      {children}
    </button>
  )
}
