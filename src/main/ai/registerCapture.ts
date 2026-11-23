import { ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type { AnalyzeResult, CaptureContext } from '@shared/capture'
import type { AiService } from './aiService'
import { parseInput } from './parseInput'

const MAX_CATEGORIES = 100
const MAX_NAME_LENGTH = 200

/**
 * Hängt die KI-Eingabe an IPC. Es läuft immer nur eine Analyse: Eine neue (oder "Abbrechen")
 * beendet die vorherige. Was aus dem Renderer kommt, wird geprüft, bevor es weitergeht.
 */
export function registerCaptureHandlers(ai: AiService): void {
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
        return await parseInput(ai.provider, input.text, input.context, controller.signal)
      } finally {
        if (current === controller) current = undefined
      }
    }
  )

  ipcMain.on(IpcChannels.captureCancel, () => current?.abort())

  // Einstellungen: Status (Ollama erreichbar? welche Modelle?) und Modellwahl
  ipcMain.handle(IpcChannels.aiStatus, () => ai.status())
  ipcMain.handle(IpcChannels.aiSetModel, (_event, model: unknown) => ai.setModel(model))
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
      // Obergrenze, damit der Renderer (oder ein importierter Stand) die Anfrage nicht aufblähen kann
      kategorien: kategorien
        .slice(0, MAX_CATEGORIES)
        .filter((k): k is string => typeof k === 'string' && k.length <= MAX_NAME_LENGTH),
      ...(typeof aktuelleKategorie === 'string' ? { aktuelleKategorie } : {})
    }
  }
}
