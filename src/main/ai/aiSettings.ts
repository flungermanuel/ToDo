import { readFile } from 'node:fs/promises'
import { writeFileAtomic } from '../storage/atomicWrite'

// Einstellungen der KI-Eingabe (bisher nur das Modell) in einer kleinen Datei im Datenordner.
// Bewusst NICHT in der Datenbank: Es sind Einstellungen dieses Rechners, keine Nutzerdaten –
// sie gehören nicht in Export/Import und Sicherungen, und sie funktionieren auch dann, wenn
// die Datenbank gerade nicht verfügbar ist. Eingaben und Modellantworten stehen hier nie.

const MAX_MODEL_LENGTH = 100

export class AiSettingsStore {
  private constructor(
    private readonly filePath: string,
    private model: string
  ) {}

  /**
   * Liest die Datei. Fehlt sie oder ist sie unbrauchbar, gilt `fallbackModel` –
   * eine kaputte Einstellungsdatei darf die App nie stören.
   */
  static async open(filePath: string, fallbackModel: string): Promise<AiSettingsStore> {
    let model = fallbackModel
    try {
      const parsed: unknown = JSON.parse(await readFile(filePath, 'utf-8'))
      const stored = (parsed as { model?: unknown } | null)?.model
      if (isValidModel(stored)) model = stored
    } catch {
      // keine oder unlesbare Datei: Standard
    }
    return new AiSettingsStore(filePath, model)
  }

  get currentModel(): string {
    return this.model
  }

  /** Setzt und speichert das Modell. Ungültige Namen werden abgelehnt. */
  async setModel(model: unknown): Promise<void> {
    if (!isValidModel(model)) throw new Error('Ungültiger Modellname')
    await writeFileAtomic(this.filePath, JSON.stringify({ model }, null, 2))
    this.model = model
  }
}

/** Modellnamen wie "gemma3:4b" oder "library/llama3.2:3b": kurz, ohne Leer- und Steuerzeichen */
export function isValidModel(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_MODEL_LENGTH &&
    /^[\w.:/-]+$/.test(value)
  )
}
