import { useSyncExternalStore } from 'react'
import * as core from '@core/index'
import type { AnalyzeResult, CaptureContext } from '@shared/capture'
import { getData, updateData } from './appStore'
import { showUndo } from './toastStore'
import { readLastCategoryId } from './useLastCategory'

// Zustand der KI-Eingabe: Text, laufende Analyse und die Vorschau-Karten.
// Die Analyse selbst läuft in Main (window.api.capture) – hier steht nur, was die UI zeigt.
// Nichts wird gespeichert, bevor "Übernehmen" gedrückt wird; der Eingabetext bleibt bei
// Abbruch, Fehler und Verwerfen erhalten, bis man ihn selbst löscht.

export type CapturePhase = 'idle' | 'analyzing' | 'preview'

export interface CaptureState {
  /** Ist die Schnellleiste (Overlay) offen? */
  open: boolean
  text: string
  phase: CapturePhase
  /** Der Text, aus dem die aktuelle Vorschau entstanden ist */
  analyzedText: string
  cards: core.CaptureCard[]
  /** Hinweise zur Vorschau (z. B. "Keine Aufgabe erkannt") */
  notice: string | null
  /** Ist der Hinweis ein Fehler? (nur für die Farbe) */
  failed: boolean
}

const INITIAL: CaptureState = {
  open: false,
  text: '',
  phase: 'idle',
  analyzedText: '',
  cards: [],
  notice: null,
  failed: false
}

let state: CaptureState = INITIAL
// Zählt Analysen hoch: Antworten abgebrochener oder überholter Analysen werden ignoriert
let run = 0
const listeners = new Set<() => void>()

function set(patch: Partial<CaptureState>): void {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function buildContext(): CaptureContext {
  const { categories } = getData()
  const current = categories.find((c) => c.id === readLastCategoryId())?.name
  return {
    heute: core.toIsoDate(new Date()),
    kategorien: categories.map((c) => c.name),
    ...(current ? { aktuelleKategorie: current } : {})
  }
}

/** Kategorie für Karten ohne eigene: die zuletzt gewählte, sonst die erste (macht core) */
function currentCategoryId(): string | undefined {
  return readLastCategoryId() ?? undefined
}

function showResult(result: AnalyzeResult, text: string): void {
  const { categories } = getData()

  if (result.status === 'ok') {
    const cards = core.cardsFromEntries(result.entries, categories, currentCategoryId())
    const notice =
      cards.length === 0
        ? 'Keine Aufgabe erkannt.'
        : result.notices.length > 0
          ? result.notices.join(' ')
          : null
    set({ phase: 'preview', analyzedText: text, cards, notice, failed: false })
    return
  }

  if (result.error.kind === 'canceled') {
    set({ phase: 'idle' })
    return
  }
  // Fehlerfall ohne Datenverlust: ein normales Todo mit dem Rohtext als Titel zum Ausfüllen
  set({
    phase: 'preview',
    analyzedText: text,
    cards: [core.fallbackCard(text, categories, currentCategoryId())],
    notice: `${result.error.message} Du kannst den Eintrag selbst ausfüllen.`,
    failed: true
  })
}

export const captureActions = {
  /** Öffnet die Schnellleiste (z. B. per Hotkey) */
  open: () => set({ open: true }),

  /** Schließt und verwirft die Vorschau – der Eingabetext bleibt */
  close: () => {
    if (state.phase === 'analyzing') captureActions.cancel()
    set({ open: false, phase: 'idle', cards: [], notice: null, failed: false })
  },

  setText: (text: string) => set({ text }),

  /** Startet die Analyse und öffnet die Vorschau */
  submit: async () => {
    const text = state.text.trim()
    if (!text) return
    const myRun = ++run
    set({ open: true, phase: 'analyzing', cards: [], notice: null, failed: false })

    let result: AnalyzeResult
    try {
      result = await window.api.capture.analyze(text, buildContext())
    } catch {
      result = {
        status: 'error',
        error: { kind: 'failed', message: 'Die Analyse ist fehlgeschlagen.' }
      }
    }
    if (myRun !== run) return // inzwischen abgebrochen oder neu gestartet
    showResult(result, text)
  },

  /** Bricht die laufende Analyse ab, der Text bleibt */
  cancel: () => {
    if (state.phase !== 'analyzing') return
    run++
    window.api.capture.cancel()
    set({ phase: 'idle' })
  },

  updateCard: (key: string, patch: Partial<core.CaptureCard>) =>
    set({ cards: state.cards.map((c) => (c.key === key ? { ...c, ...patch } : c)) }),

  removeCard: (key: string) => set({ cards: state.cards.filter((c) => c.key !== key) }),

  /** Legt statt der Analyse ein normales Todo mit dem Text als Titel an (zum Ausfüllen) */
  addFallbackCard: () =>
    set({
      cards: [
        ...state.cards,
        core.fallbackCard(state.text, getData().categories, currentCategoryId())
      ]
    }),

  /** Legt alle Karten an. Meldet "N Einträge angelegt" mit Rückgängig (löscht genau diese). */
  apply: () => {
    if (!core.canApply(state.cards)) return
    let created: core.CreatedIds = { todos: [], deadlines: [], exams: [] }
    updateData((data) => {
      const result = core.applyCards(data, state.cards)
      created = result.created
      return result.data
    })

    const count = core.countCreated(created)
    if (count > 0) {
      showUndo(count === 1 ? '1 Eintrag angelegt' : `${count} Einträge angelegt`, () =>
        updateData((data) => core.removeCreated(data, created))
      )
    }
    set({ ...INITIAL })
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCapture(): CaptureState {
  return useSyncExternalStore(subscribe, () => state)
}
