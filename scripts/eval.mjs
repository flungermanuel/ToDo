// Misst, wie gut ein Modell Freitext in Einträge umwandelt (docs/evaluation.md).
//
//   npm run eval -- --provider ollama --model gemma3:4b
//   npm run eval -- --provider fake            (nur zum Ausprobieren der Auswertung)
//
// Braucht für Ollama ein laufendes Ollama mit dem Modell. Läuft nur manuell, nicht in der CI.
// Die Fälle stehen in eval/cases.json, die Rohergebnisse landen in eval/results/.

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
// vitest direkt mit Node starten (ohne Shell, kein Argument-Escaping nötig)
const VITEST = join(
  dirname(createRequire(import.meta.url).resolve('vitest/package.json')),
  'vitest.mjs'
)

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const provider = arg('provider', 'ollama')
const model = arg('model', 'gemma3:4b')
if (!['ollama', 'fake'].includes(provider)) {
  console.error('Unbekannter Provider. Erlaubt: ollama, fake')
  process.exit(1)
}

console.log(`Evaluation: ${provider}${provider === 'ollama' ? ` / ${model}` : ''} …`)
const run = spawnSync(process.execPath, [VITEST, 'run', '--config', 'vitest.eval.config.mts'], {
  cwd: ROOT,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, EVAL_PROVIDER: provider, EVAL_MODEL: model }
})
if (run.status !== 0) {
  console.error('Die Evaluation ist fehlgeschlagen (läuft Ollama, ist das Modell installiert?).')
  process.exit(run.status ?? 1)
}

const file = join(ROOT, 'eval', 'results', `${provider}-${model.replace(/[^\w.-]/g, '_')}.json`)
const { summary: s, warmupMs, results } = JSON.parse(readFileSync(file, 'utf-8'))

const pct = (value) => `${value.toFixed(0)} %`
const sec = (ms) => `${(ms / 1000).toFixed(1)} s`
console.log(`
Ergebnis (${s.faelle} Fälle)
  Alles richtig        ${s.komplett} von ${s.faelle}
  Typ                  ${pct(s.typ)}
  Titel                ${pct(s.titel)}
  Datum                ${pct(s.datum)}
  Kategorie            ${pct(s.kategorie)}
  Priorität            ${pct(s.prioritaet)}
  Text ohne Aufgabe    ${s.leerRichtig} von ${s.leerGesamt} richtig leer
  Fehler (kein Ergebnis) ${s.fehler}
  Dauer pro Eingabe    Ø ${sec(s.dauerMittel)}, längste ${sec(s.dauerMax)}
  Laden des Modells    ${sec(warmupMs)} (erster Aufruf, nicht eingerechnet)
`)

const wrong = results.filter((r) => !r.score.komplett)
if (wrong.length > 0) {
  console.log('Nicht komplett richtig:')
  for (const r of wrong) {
    const got = r.fehler
      ? `FEHLER: ${r.fehler}`
      : r.geliefert.map((e) => `${e.typ} „${e.titel}“ ${e.datum ?? 'ohne Datum'}`).join(' | ') ||
        '(nichts)'
    console.log(`  #${r.id} [${r.gruppe}] ${r.text}\n      geliefert: ${got}`)
  }
}
console.log(`\nRohdaten: ${file}`)
