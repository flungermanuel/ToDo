import { useSyncExternalStore } from 'react'
import { emptyAppData, type AppData } from '@shared/types'
import { hideToast, showToast } from './toastStore'

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
// ID des Fehler-Hinweises, solange einer angezeigt wird
let saveErrorToast: number | undefined

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

/** Aktueller Stand – für Aktionen, die nach einer Änderung etwas nachschlagen müssen */
export function getData(): AppData {
  return snapshot.data
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
  void flushPendingSave()
}

/**
 * Schreibt eine noch wartende Änderung sofort und wartet, bis sie gespeichert ist –
 * z. B. vor einem Export, damit die letzte Änderung mit drin ist.
 */
export async function flushPendingSave(): Promise<void> {
  if (saveTimer === undefined) return
  clearTimeout(saveTimer)
  saveTimer = undefined
  await save()
}

/**
 * Ersetzt den kompletten Stand durch Daten, die Main schon gespeichert hat (Import).
 * Deshalb wird hier nicht noch einmal gespeichert.
 */
export function replaceData(data: AppData): void {
  clearTimeout(saveTimer)
  saveTimer = undefined
  setSnapshot({ data, status: 'ready' })
}

function save(): Promise<void> {
  return window.api.data.save(snapshot.data).then(
    () => {
      // Hat es nach einem Fehler wieder geklappt, verschwindet der Hinweis
      if (saveErrorToast !== undefined) hideToast(saveErrorToast)
      saveErrorToast = undefined
    },
    (error: unknown) => {
      console.error('Speichern fehlgeschlagen:', error)
      // Bleibt stehen, bis das Speichern wieder klappt – sonst übersieht man ihn
      saveErrorToast = showToast('Änderungen konnten nicht gespeichert werden', {
        tone: 'danger',
        durationMs: null,
        action: { label: 'Erneut versuchen', run: save }
      })
    }
  )
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
