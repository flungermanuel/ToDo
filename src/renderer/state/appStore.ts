import { useSyncExternalStore } from 'react'
import { emptyAppData, type AppData } from '@shared/types'

// Zentraler Zustand der UI. Hält die AppData, benachrichtigt React bei Änderungen
// und speichert (leicht verzögert) über window.api. Logik steckt hier keine –
// die kommt aus @core, siehe actions.ts.

export type LoadStatus = 'loading' | 'ready' | 'error'

interface Snapshot {
  data: AppData
  status: LoadStatus
}

const SAVE_DELAY_MS = 200

let snapshot: Snapshot = { data: emptyAppData(), status: 'loading' }
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

function setSnapshot(next: Snapshot): void {
  snapshot = next
  listeners.forEach((listener) => listener())
}

export async function loadData(): Promise<void> {
  try {
    const data = await window.api.data.load()
    setSnapshot({ data, status: 'ready' })
  } catch (error) {
    console.error('Laden fehlgeschlagen:', error)
    setSnapshot({ ...snapshot, status: 'error' })
  }
}

/** Wendet eine (reine) Änderung an und plant das Speichern ein. */
export function updateData(change: (data: AppData) => AppData): void {
  // Nicht speichern, solange nicht geladen ist – sonst überschreiben wir echte Daten mit leeren
  if (snapshot.status !== 'ready') return
  const next = change(snapshot.data)
  if (next === snapshot.data) return
  setSnapshot({ ...snapshot, data: next })
  scheduleSave()
}

function scheduleSave(): void {
  clearTimeout(saveTimer)
  // Mehrere schnelle Änderungen hintereinander → nur ein Schreibvorgang
  saveTimer = setTimeout(flushSave, SAVE_DELAY_MS)
}

function flushSave(): void {
  if (saveTimer === undefined) return
  clearTimeout(saveTimer)
  saveTimer = undefined
  window.api.data.save(snapshot.data).catch((error) => {
    console.error('Speichern fehlgeschlagen:', error)
  })
}

// Beim Schließen des Fensters ausstehende Änderungen sofort schreiben
window.addEventListener('beforeunload', flushSave)

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAppStore(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot)
}
