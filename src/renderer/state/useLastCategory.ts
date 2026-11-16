import { useState } from 'react'
import type { Category } from '@shared/types'

// Merkt sich die zuletzt gewählte Kategorie für neue Todos (Ansichtseinstellung → localStorage).
// Gibt es sie nicht mehr (gelöscht), wird die erste Kategorie genommen.

const STORAGE_KEY = 'flungdo.lastCategory'

/** Zuletzt gewählte Kategorie, ohne Hook – für Stellen außerhalb von Komponenten */
export function readLastCategoryId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function useLastCategory(categories: Category[]): [string, (id: string) => void] {
  const [stored, setStored] = useState<string | null>(readLastCategoryId)

  const valid = categories.some((c) => c.id === stored) ? stored! : (categories[0]?.id ?? '')

  function select(id: string) {
    setStored(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // egal – dann wird die Wahl eben nicht gemerkt
    }
  }

  return [valid, select]
}
