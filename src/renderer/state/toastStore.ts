import { useSyncExternalStore } from 'react'

// Kurzer Hinweis unten im Fenster, z. B. "„Gym“ gelöscht · Rückgängig".
// Es gibt immer höchstens einen – ein neuer ersetzt den alten (wie bei macOS).

export interface Toast {
  /** Wechselt bei jedem neuen Hinweis, damit die Animation neu startet */
  id: number
  message: string
  tone: 'default' | 'danger'
  action?: { label: string; run: () => void }
}

interface ShowOptions {
  tone?: Toast['tone']
  action?: Toast['action']
  /** Wie lange der Hinweis stehen bleibt. `null` = bis er ersetzt oder geschlossen wird */
  durationMs?: number | null
}

const DEFAULT_DURATION_MS = 5000

let current: Toast | null = null
let nextId = 1
let hideTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function set(next: Toast | null): void {
  current = next
  listeners.forEach((listener) => listener())
}

export function showToast(message: string, options: ShowOptions = {}): number {
  const { tone = 'default', action, durationMs = DEFAULT_DURATION_MS } = options
  const id = nextId++
  clearTimeout(hideTimer)
  set({ id, message, tone, action })
  if (durationMs !== null) hideTimer = setTimeout(() => hideToast(id), durationMs)
  return id
}

/** Schließt den Hinweis – mit `id` nur, wenn es noch derselbe ist */
export function hideToast(id?: number): void {
  if (!current || (id !== undefined && current.id !== id)) return
  clearTimeout(hideTimer)
  set(null)
}

/** "Gelöscht"-Hinweis mit Rückgängig-Knopf */
export function showUndo(message: string, undo: () => void): void {
  showToast(message, { action: { label: 'Rückgängig', run: undo } })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useToast(): Toast | null {
  return useSyncExternalStore(subscribe, () => current)
}
