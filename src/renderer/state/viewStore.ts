import { useSyncExternalStore } from 'react'
import { addDays, toIsoDate } from '@core/index'
import type { IsoDate } from '@shared/types'

// Welche Ansicht links gezeigt wird (Tag oder Woche) und welcher Tag ausgewählt ist.
// Ein eigener kleiner Store, weil Todo-Widget UND Kalender darauf zugreifen
// (Klick auf einen Tag im Kalender → Tagesansicht links).
// Die Ansicht wird gemerkt (localStorage), der Tag nicht – beim Start ist immer heute.

export type ViewMode = 'tag' | 'woche'

interface ViewState {
  mode: ViewMode
  /** Angezeigter Tag – in der Wochenansicht bestimmt er, welche Woche gezeigt wird */
  day: IsoDate
}

const STORAGE_KEY = 'flungdo.viewMode'

function readMode(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'woche' ? 'woche' : 'tag'
  } catch {
    return 'tag'
  }
}

let state: ViewState = { mode: readMode(), day: toIsoDate(new Date()) }
const listeners = new Set<() => void>()

function setState(next: ViewState): void {
  state = next
  listeners.forEach((l) => l())
}

export const viewActions = {
  setMode(mode: ViewMode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // nicht schlimm
    }
    setState({ ...state, mode })
  },
  /** Einen bestimmten Tag in der Tagesansicht öffnen (z. B. Klick im Kalender) */
  openDay(day: IsoDate) {
    viewActions.setMode('tag')
    setState({ ...state, day })
  },
  /** Einen Tag auswählen, ohne die Ansicht zu wechseln */
  selectDay(day: IsoDate) {
    setState({ ...state, day })
  },
  /** Einen Schritt vor oder zurück: ein Tag bzw. eine Woche */
  step(direction: 1 | -1) {
    setState({ ...state, day: addDays(state.day, direction * (state.mode === 'woche' ? 7 : 1)) })
  },
  today() {
    setState({ ...state, day: toIsoDate(new Date()) })
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useView(): ViewState {
  return useSyncExternalStore(subscribe, () => state)
}
