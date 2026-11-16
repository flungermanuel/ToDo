import { FakeProvider } from './FakeProvider'
import { OllamaProvider } from './OllamaProvider'
import type { AiProvider } from './Provider'

/** Vorläufiges Standardmodell – welches es endgültig wird, entscheidet die Evaluation. */
export const DEFAULT_MODEL = 'gemma3:4b'

/**
 * Wählt den Provider beim Start: Ollama, oder mit FLUNGDO_AI=fake der FakeProvider
 * (feste Antworten und 800 ms künstliche Wartezeit, für die Entwicklung ohne Modell).
 * FLUNGDO_AI_MODEL wählt ein anderes Modell, bis die Einstellungen es speichern können.
 */
export function createProvider(env: NodeJS.ProcessEnv = process.env): AiProvider {
  if (env['FLUNGDO_AI'] === 'fake') return new FakeProvider({}, { delayMs: 800 })
  return new OllamaProvider({ model: env['FLUNGDO_AI_MODEL'] || DEFAULT_MODEL })
}
