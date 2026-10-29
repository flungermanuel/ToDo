import { useState } from 'react'
import { isNameTaken } from '@core/index'
import type { Category } from '@shared/types'
import { categoryActions } from '@renderer/state/actions'
import { CATEGORY_COLOR_META } from '@renderer/lib/categoryColors'
import { cn } from '@renderer/lib/utils'

interface RenameCategoryInputProps {
  category: Category
  categories: Category[]
  onDone: () => void
  className?: string
}

// Name einer Kategorie direkt an Ort und Stelle ändern (Überschrift, Seitenleiste).
// Der Name wird zum Eingabefeld. Enter/Klick daneben speichert, Escape bricht ab.
// Ein schon vergebener Name wird rot markiert und nicht übernommen.
export function RenameCategoryInput({
  category,
  categories,
  onDone,
  className
}: RenameCategoryInputProps) {
  const [name, setName] = useState(category.name)
  const taken = isNameTaken({ categories }, name, category.id)

  function commit() {
    if (name.trim() && !taken) categoryActions.rename(category.id, name)
    onDone()
  }

  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-2', className)}>
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: CATEGORY_COLOR_META[category.farbe].css }}
        aria-hidden
      />
      <input
        autoFocus
        value={name}
        aria-label="Kategorie umbenennen"
        aria-invalid={taken}
        title={taken ? 'Diesen Namen gibt es schon' : undefined}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onDone()
        }}
        className={cn(
          'min-w-0 flex-1 rounded-md border bg-surface px-1.5 py-0.5 text-[13px] font-semibold outline-none',
          taken ? 'border-danger' : 'border-accent'
        )}
      />
    </div>
  )
}
