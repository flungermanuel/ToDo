import { useEffect, useRef, useState } from 'react'
import { cn } from '@renderer/lib/utils'

interface EditableTextProps {
  value: string
  onSave: (value: string) => void
  className?: string
  /** Wird angezeigt, wenn der Text bearbeitet werden kann */
  label: string
}

// Text, der per Doppelklick (oder Enter bei Fokus) zum Eingabefeld wird.
// Enter oder Klick daneben speichert, Escape bricht ab.
export function EditableText({ value, onSave, className, label }: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function start() {
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    if (draft.trim() && draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className={cn('w-full min-w-0 bg-transparent outline-none', className)}
      />
    )
  }

  return (
    <span
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${value}`}
      title="Doppelklick zum Bearbeiten"
      onDoubleClick={start}
      onKeyDown={(e) => {
        if (e.key === 'Enter') start()
      }}
      className={cn('min-w-0 cursor-default truncate rounded-sm', className)}
    >
      {value}
    </span>
  )
}
