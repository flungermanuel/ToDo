import { CAPTURE_JSON_SCHEMA } from '@core/index'
import promptTemplate from './prompt.de.md?raw'
import { AiError, type AiProvider, type ExtractRequest } from './Provider'

// Anbindung an Ollama, das lokal auf diesem Rechner läuft (keine Daten verlassen ihn).
// Hardware-Rahmen: kleines Modell auf der CPU → kurzer Prompt, kurze Ausgabe, Temperatur 0,
// großzügiger Timeout und `keep_alive`, damit das Modell zwischen Eingaben geladen bleibt.

export const OLLAMA_URL = 'http://127.0.0.1:11434'
export const DEFAULT_TIMEOUT_MS = 60_000
/** So lange bleibt das Modell nach einer Anfrage im Speicher (Laden dauert auf der CPU lange) */
const KEEP_ALIVE = '30m'
/** Obergrenze für die Antwort: ein paar Einträge als JSON brauchen weit weniger */
const MAX_OUTPUT_TOKENS = 600

export interface OllamaOptions {
  /** Eine Funktion, damit ein in den Einstellungen geändertes Modell sofort gilt */
  model: string | (() => string)
  baseUrl?: string
  timeoutMs?: number
  /** Für Tests austauschbar, sonst das eingebaute fetch */
  fetch?: typeof fetch
}

export class OllamaProvider implements AiProvider {
  readonly name = 'ollama'
  private readonly getModel: () => string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly fetchFn: typeof fetch

  constructor(options: OllamaOptions) {
    const { model } = options
    this.getModel = typeof model === 'function' ? model : () => model
    this.baseUrl = options.baseUrl ?? OLLAMA_URL
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.fetchFn = options.fetch ?? fetch
  }

  async extract(request: ExtractRequest, signal?: AbortSignal): Promise<unknown> {
    const response = await this.call(
      '/api/chat',
      {
        model: this.getModel(),
        stream: false,
        // Antwort auf das Schema festlegen (Ollama erzwingt das JSON-Format)
        format: CAPTURE_JSON_SCHEMA,
        keep_alive: KEEP_ALIVE,
        options: { temperature: 0, num_predict: MAX_OUTPUT_TOKENS },
        messages: [
          { role: 'system', content: buildSystemPrompt(request) },
          { role: 'user', content: wrapUserText(request.text) }
        ]
      },
      signal
    )

    const content = (response as { message?: { content?: unknown } } | null)?.message?.content
    if (typeof content !== 'string') {
      throw new AiError('invalid', 'Die Antwort des Modells war nicht brauchbar.')
    }
    try {
      return JSON.parse(content)
    } catch {
      throw new AiError('invalid', 'Die Antwort des Modells war nicht brauchbar.')
    }
  }

  /** Namen der installierten Modelle (für die Auswahl in den Einstellungen) */
  async listModels(signal?: AbortSignal): Promise<string[]> {
    const response = (await this.call('/api/tags', undefined, signal)) as {
      models?: Array<{ name?: unknown }>
    } | null
    const models = Array.isArray(response?.models) ? response.models : []
    return models.map((m) => m.name).filter((n): n is string => typeof n === 'string')
  }

  /** Ein Aufruf mit Timeout, Abbruch und verständlichen Fehlern */
  private async call(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw new AiError('canceled', 'Abgebrochen')
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.timeoutMs)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort, { once: true })

    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        ...(body === undefined
          ? {}
          : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        signal: controller.signal
      })
      if (response.status === 404) {
        throw new AiError(
          'model-missing',
          `Das Modell „${this.getModel()}“ ist nicht installiert. Lade es mit: ollama pull ${this.getModel()}`
        )
      }
      if (!response.ok) {
        throw new AiError('failed', `Ollama hat mit Fehler ${response.status} geantwortet.`)
      }
      return await response.json()
    } catch (error) {
      if (error instanceof AiError) throw error
      if (signal?.aborted) throw new AiError('canceled', 'Abgebrochen')
      if (timedOut) {
        throw new AiError(
          'timeout',
          `Das Modell hat nicht innerhalb von ${Math.round(this.timeoutMs / 1000)} Sekunden geantwortet.`
        )
      }
      if (error instanceof SyntaxError) {
        throw new AiError('invalid', 'Die Antwort von Ollama war nicht lesbar.')
      }
      // Alles andere (Verbindung abgelehnt usw.): Ollama läuft nicht
      throw new AiError(
        'unreachable',
        'Ollama ist nicht erreichbar. Starte Ollama und versuche es noch einmal.'
      )
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }
}

/** Prompt aus der Datei mit Datum, Wochentag und Kategorien befüllt */
export function buildSystemPrompt(request: ExtractRequest): string {
  const names = request.kategorien.slice(0, MAX_PROMPT_CATEGORIES).map(sanitizeName)
  const categories = names.length > 0 ? names.join(', ') : '(keine)'
  return promptTemplate
    .replaceAll('{{HEUTE}}', request.heute)
    .replaceAll('{{WOCHENTAG}}', request.wochentag)
    .replaceAll('{{KATEGORIEN}}', categories)
    .replaceAll('{{AKTUELLE_KATEGORIE}}', sanitizeName(request.aktuelleKategorie ?? '(keine)'))
    .trim()
}

const MAX_PROMPT_CATEGORIES = 30
const MAX_PROMPT_NAME_LENGTH = 40

/**
 * Kategorienamen stehen im Systemprompt. Ein importiertes JSON könnte dort Anweisungen
 * verstecken (Zeilenumbrüche, Markierungen) – darum nur eine kurze Zeile ohne Sonderzeichen.
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[\p{Cc}<>{}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PROMPT_NAME_LENGTH)
}

/**
 * Der Nutzertext geht als Daten zwischen Markierungen ans Modell. Markierungen im Text
 * selbst werden entfernt, damit man den Datenbereich nicht "verlassen" kann.
 */
export function wrapUserText(text: string): string {
  return `<text>${text.replace(/<\/?text>/gi, '')}</text>`
}
