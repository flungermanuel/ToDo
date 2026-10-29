import { useState, type CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import type { Category } from '@shared/types'
import { CATEGORY_COLOR_META } from '@renderer/lib/categoryColors'
import { cn } from '@renderer/lib/utils'

interface CategoryChipsProps {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  /** Neue Kategorie anlegen – gibt die neue ID zurück oder null (Name ungültig/vergeben) */
  onCreate: (name: string) => string | null
}

// Auswahl der Kategorie für ein neues Todo: eine Reihe kleiner Chips.
// Das "+" am Ende wird zu einem Eingabefeld für eine neue Kategorie.
export function CategoryChips({ categories, value, onChange, onCreate }: CategoryChipsProps) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [invalid, setInvalid] = useState(false)

  function submit() {
    if (!name.trim()) {
      setCreating(false)
      return
    }
    const id = onCreate(name)
    if (!id) {
      setInvalid(true)
      return
    }
    onChange(id)
    setName('')
    setCreating(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pl-[42px]" role="radiogroup">
      {categories.map((c) => {
        const selected = c.id === value
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c.id)}
            style={{ '--chip': CATEGORY_COLOR_META[c.farbe].css } as CSSProperties}
            className={cn(
              'flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors',
              selected
                ? 'border-(--chip) bg-[color-mix(in_srgb,var(--chip)_14%,transparent)] font-medium text-fg'
                : 'border-separator text-fg-muted hover:bg-hover hover:text-fg'
            )}
          >
            <span className="size-2 rounded-full bg-(--chip)" aria-hidden />
            {c.name}
          </button>
        )
      })}

      {creating ? (
        <input
          autoFocus
          value={name}
          placeholder="Neue Kategorie"
          aria-label="Name der neuen Kategorie"
          aria-invalid={invalid}
          title={invalid ? 'Diesen Namen gibt es schon' : undefined}
          onChange={(e) => {
            setName(e.target.value)
            setInvalid(false)
          }}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') {
              setName('')
              setCreating(false)
            }
          }}
          className={cn(
            'h-6 w-32 rounded-full border bg-transparent px-2.5 text-xs outline-none',
            invalid ? 'border-danger' : 'border-accent'
          )}
        />
      ) : (
        <button
          type="button"
          aria-label="Neue Kategorie"
          title="Neue Kategorie"
          onClick={() => setCreating(true)}
          className="flex size-6 items-center justify-center rounded-full border border-dashed border-separator text-fg-subtle hover:border-fg-subtle hover:text-fg"
        >
          <Plus className="size-3" />
        </button>
      )}
    </div>
  )
}
