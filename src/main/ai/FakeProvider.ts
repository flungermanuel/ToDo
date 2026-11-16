import { AiError, type AiProvider, type ExtractRequest } from './Provider'

// Feste Antworten für Tests und für die Entwicklung ohne Modell. Dadurch lässt sich der
// ganze Ablauf (Eingabe, Analyse, Vorschau, Übernehmen) prüfen, bevor Ollama läuft.

const EXAMPLE_TEXT = 'Freitag Abgabe Statistik, Mama anrufen, Prüfung Analysis am 12. Februar'

const EXAMPLE_ANSWER = {
  eintraege: [
    { typ: 'deadline', titel: 'Abgabe Statistik', datumText: 'Freitag', kategorie: 'Studium' },
    { typ: 'todo', titel: 'Mama anrufen', datumText: '', kategorie: 'Persönlich' },
    { typ: 'pruefung', titel: 'Analysis', datumText: '12. Februar', kategorie: 'Studium' }
  ]
}

export interface FakeProviderOptions {
  /** Künstliche Wartezeit, um Ladezustand und Abbrechen auszuprobieren */
  delayMs?: number
  /** Wirft stattdessen diesen Fehler */
  fail?: AiError
}

export class FakeProvider implements AiProvider {
  readonly name = 'fake'
  /** Alle bisherigen Anfragen – Tests prüfen damit, was der Provider bekommen hat */
  readonly requests: ExtractRequest[] = []
  private readonly answers = new Map<string, unknown>()

  constructor(
    answers: Record<string, unknown> = {},
    private readonly options: FakeProviderOptions = {}
  ) {
    this.answers.set(normalize(EXAMPLE_TEXT), EXAMPLE_ANSWER)
    for (const [text, answer] of Object.entries(answers)) this.answers.set(normalize(text), answer)
  }

  async extract(request: ExtractRequest, signal?: AbortSignal): Promise<unknown> {
    this.requests.push(request)
    await wait(this.options.delayMs ?? 0, signal)
    if (this.options.fail) throw this.options.fail

    const known = this.answers.get(normalize(request.text))
    if (known !== undefined) return known
    // Unbekannter Text: ein einzelnes Todo mit dem Text als Titel
    return {
      eintraege: [{ typ: 'todo', titel: request.text, datumText: '', kategorie: '' }]
    }
  }
}

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de')
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AiError('canceled', 'Abgebrochen'))
    if (ms <= 0) return resolve()
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new AiError('canceled', 'Abgebrochen'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
