import { FakeProvider } from './FakeProvider'
import type { AiProvider } from './Provider'

/**
 * Wählt den Provider beim Start. Bisher gibt es nur den FakeProvider (feste Antworten,
 * 800 ms künstliche Wartezeit, damit Ladezustand und Abbrechen sichtbar sind).
 * Der Ollama-Provider kommt in einem späteren Schritt dazu.
 */
export function createProvider(): AiProvider {
  return new FakeProvider({}, { delayMs: 800 })
}
