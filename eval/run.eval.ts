import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { it } from 'vitest'
import { FakeProvider } from '../src/main/ai/FakeProvider'
import { OllamaProvider } from '../src/main/ai/OllamaProvider'
import { parseInput } from '../src/main/ai/parseInput'
import type { AiProvider } from '../src/main/ai/Provider'
import cases from './cases.json'
import { scoreCase, summarize, type ActualEntry, type EvalCase } from './score'

// Die Evaluation selbst. Wird NICHT von `npm test` ausgeführt (dort zählen nur src/**/*.test.ts),
// sondern über `npm run eval` (scripts/eval.mjs), weil sie ein laufendes Ollama braucht.
// Ablauf: jeder Fall geht durch dasselbe parseInput wie in der App; ein erster Aufruf
// (Aufwärmen) lädt das Modell, damit die Zeiten das Laden nicht enthalten.

const providerName = process.env['EVAL_PROVIDER'] ?? 'ollama'
const model = process.env['EVAL_MODEL'] ?? 'gemma3:4b'

function createProvider(): AiProvider {
  if (providerName === 'fake') return new FakeProvider()
  // Großzügiger Timeout: Auf der CPU kann ein einzelner Fall länger dauern
  return new OllamaProvider({ model, timeoutMs: 180_000 })
}

it(
  `Evaluation: ${providerName} ${model}`,
  async () => {
    const provider = createProvider()
    const context = { heute: cases.heute, kategorien: cases.kategorien }

    const warmupStart = Date.now()
    await parseInput(provider, 'Aufwärmen', context)
    const warmupMs = Date.now() - warmupStart

    const results = []
    for (const testCase of cases.faelle as EvalCase[]) {
      const start = Date.now()
      const result = await parseInput(provider, testCase.text, {
        ...context,
        kategorien: testCase.kategorien ?? context.kategorien
      })
      const ms = Date.now() - start

      const actual: ActualEntry[] =
        result.status === 'ok'
          ? result.entries.map((e) => ({
              typ: e.typ,
              titel: e.titel,
              datum: e.datum,
              kategorie: e.kategorie,
              ...(e.prioritaet ? { prioritaet: e.prioritaet } : {})
            }))
          : []
      results.push({
        id: testCase.id,
        gruppe: testCase.gruppe,
        text: testCase.text,
        erwartet: testCase.erwartet,
        geliefert: actual,
        fehler: result.status === 'error' ? result.error.message : null,
        failed: result.status === 'error',
        ms,
        score: scoreCase(testCase.erwartet, actual)
      })
    }

    const summary = summarize(results)
    const dir = join(import.meta.dirname, 'results')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `${providerName}-${model.replace(/[^\w.-]/g, '_')}.json`)
    writeFileSync(
      file,
      JSON.stringify(
        { provider: providerName, model, heute: cases.heute, warmupMs, summary, results },
        null,
        2
      )
    )
  },
  // Bis zu 40 Fälle à ein paar Sekunden bis Minuten
  60 * 60 * 1000
)
