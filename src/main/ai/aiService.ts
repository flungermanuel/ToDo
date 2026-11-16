import { join } from 'node:path'
import type { AiStatus } from '@shared/capture'
import { AiSettingsStore } from './aiSettings'
import { FakeProvider } from './FakeProvider'
import { OllamaProvider } from './OllamaProvider'
import type { AiProvider } from './Provider'

/** Standardmodell, begründet in docs/evaluation.md (37 von 40 Fällen, llama3.2:3b: 31). */
export const DEFAULT_MODEL = 'gemma3:4b'

export const SETTINGS_FILE = 'ai-settings.json'

/** Alles, was Main für die KI-Eingabe braucht: den Provider und die Einstellungen dazu. */
export interface AiService {
  provider: AiProvider
  status(): Promise<AiStatus>
  setModel(model: unknown): Promise<void>
}

/**
 * Baut die KI-Anbindung beim Start: Ollama mit dem in den Einstellungen gewählten Modell,
 * oder mit FLUNGDO_AI=fake der FakeProvider (feste Antworten und 800 ms künstliche
 * Wartezeit, für die Entwicklung ohne Modell). FLUNGDO_AI_MODEL überschreibt das
 * gespeicherte Modell (Entwicklung, Evaluation).
 */
export async function createAiService(
  dataDir: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchFn?: typeof fetch
): Promise<AiService> {
  if (env['FLUNGDO_AI'] === 'fake') {
    return {
      provider: new FakeProvider({}, { delayMs: 800 }),
      status: async () => ({ provider: 'fake', model: 'fake', reachable: true, models: [] }),
      setModel: async () => {}
    }
  }

  const settings = await AiSettingsStore.open(
    join(dataDir, SETTINGS_FILE),
    env['FLUNGDO_AI_MODEL'] || DEFAULT_MODEL
  )
  const ollama = new OllamaProvider({
    model: () => settings.currentModel,
    ...(fetchFn ? { fetch: fetchFn } : {})
  })

  return {
    provider: ollama,
    async status() {
      const model = settings.currentModel
      try {
        return { provider: 'ollama', model, reachable: true, models: await ollama.listModels() }
      } catch {
        return { provider: 'ollama', model, reachable: false, models: [] }
      }
    },
    setModel: (model) => settings.setModel(model)
  }
}
