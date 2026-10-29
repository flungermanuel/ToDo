import { useCallback, useState } from 'react'

// Welche Kategorien ein- oder ausgeklappt sind. Das ist eine Ansichtseinstellung,
// keine Nutzerdaten – deshalb im localStorage statt in der JSON-Datei.
//
// Gespeichert wird nur, was der Nutzer selbst umgeschaltet hat. Ohne eigene Wahl gilt:
// Kategorien mit offenen Todos sind offen, Kategorien ohne offene Todos eingeklappt.

const STORAGE_KEY = 'flungdo.collapsedCategories'

type Choices = Record<string, boolean>

function readChoices(): Choices {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return typeof parsed === 'object' && parsed !== null ? (parsed as Choices) : {}
  } catch {
    return {}
  }
}

function writeChoices(choices: Choices): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choices))
  } catch {
    // Nicht schlimm – dann merkt sich die App den Zustand eben nicht
  }
}

export function useCollapsedCategories() {
  const [choices, setChoices] = useState<Choices>(readChoices)

  const isCollapsed = useCallback(
    (categoryId: string, hasOpenTodos: boolean) => choices[categoryId] ?? !hasOpenTodos,
    [choices]
  )

  const toggle = useCallback((categoryId: string, currentlyCollapsed: boolean) => {
    setChoices((prev) => {
      const next = { ...prev, [categoryId]: !currentlyCollapsed }
      writeChoices(next)
      return next
    })
  }, [])

  /** Kategorie aufklappen, z. B. wenn gerade ein Todo hineingelegt wurde */
  const expand = useCallback((categoryId: string) => {
    setChoices((prev) => {
      if (prev[categoryId] === false) return prev
      const next = { ...prev, [categoryId]: false }
      writeChoices(next)
      return next
    })
  }, [])

  return { isCollapsed, toggle, expand }
}
