import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface AddRowProps {
  placeholder: string
  onAdd: (titel: string) => void
  /** Zusätzliche Felder rechts neben dem Titel (z. B. Datum) */
  children?: ReactNode
  /** Darf abgeschickt werden? Standard: Titel nicht leer */
  canSubmit?: boolean
  className?: string
  autoFocus?: boolean
}

// Eingabezeile "Neues …": Enter legt an, das Feld bleibt fokussiert für das nächste.
export function AddRow({
  placeholder,
  onAdd,
  children,
  canSubmit = true,
  className,
  autoFocus
}: AddRowProps) {
  const [titel, setTitel] = useState('')
  const ready = titel.trim().length > 0 && canSubmit

  function submit() {
    if (!ready) return
    onAdd(titel)
    setTitel('')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors focus-within:bg-hover',
        className
      )}
    >
      <Plus className="size-[18px] shrink-0 text-fg-subtle" strokeWidth={2} />
      <input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setTitel('')
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-subtle"
      />
      {children}
      {/* Unsichtbarer Submit, damit Enter auch mit Zusatzfeldern funktioniert */}
      <button type="submit" hidden />
    </form>
  )
}
