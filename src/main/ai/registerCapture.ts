import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { AnalyzeResult, CaptureContext } from '@shared/capture'
import { parseInput } from './parseInput'
import type { AiProvider } from './Provider'

/**
 * Hängt die Analyse an IPC. Es läuft immer nur eine Analyse: Eine neue (oder "Abbrechen")
 * beendet die vorherige. Was aus dem Renderer kommt, wird geprüft, bevor es weitergeht.
 */
export function registerCaptureHandlers(provider: AiProvider): void {
  let current: AbortController | undefined

  ipcMain.handle(
    IpcChannels.captureAnalyze,
    async (_event, text: unknown, context: unknown): Promise<AnalyzeResult> => {
      const input = toInput(text, context)
      if (!input) {
        return { status: 'error', error: { kind: 'failed', message: 'Ungültige Eingabe.' } }
      }
      current?.abort()
      const controller = new AbortController()
      current = controller
      try {
        return await parseInput(provider, input.text, input.context, controller.signal)
      } finally {
        if (current === controller) current = undefined
      }
    }
  )

  ipcMain.on(IpcChannels.captureCancel, () => current?.abort())
}

function toInput(
  text: unknown,
  context: unknown
): { text: string; context: CaptureContext } | null {
  if (typeof text !== 'string' || typeof context !== 'object' || context === null) return null
  const { heute, kategorien, aktuelleKategorie } = context as Record<string, unknown>
  if (typeof heute !== 'string' || !Array.isArray(kategorien)) return null
  return {
    text,
    context: {
      heute,
      kategorien: kategorien.filter((k): k is string => typeof k === 'string'),
      ...(typeof aktuelleKategorie === 'string' ? { aktuelleKategorie } : {})
    }
  }
}
