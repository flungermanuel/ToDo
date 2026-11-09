// Misst die echte App (docs/performance.md): Startzeit, Speichern, Ansichten wechseln.
//
//   npm run build
//   node scripts/seed.mjs perf-data
//   node scripts/measure.mjs perf-data [Starts pro Messung, Standard 5]
//
// Für jede Datenmenge (Unterordner von perf-data) und jede Speicherung (JSON, SQLite) wird
// die App mehrfach in einem frischen Daten-Ordner gestartet (FLUNGDO_DATA_DIR) und über das
// Chrome DevTools Protocol gesteuert – dafür braucht es keine zusätzliche Library, Node 24
// bringt WebSocket und fetch mit. Ausgegeben wird jeweils der Median.

import { spawn } from 'node:child_process'
import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'

const require = createRequire(import.meta.url)
/** Pfad zur Electron-Programmdatei (das npm-Paket "electron" liefert ihn als String) */
const ELECTRON = require('electron')
const ROOT = resolve(import.meta.dirname, '..')
// Jeder Start bekommt einen eigenen Debug-Port – sonst könnte sich das Skript mit einer
// gerade beendeten vorigen Instanz verbinden, die den Port noch hält
let launchCount = 0
const REPEAT = 5

const seedDir = process.argv[2]
const starts = Number(process.argv[3] ?? 5)
if (!seedDir) {
  console.error('Aufruf: node scripts/measure.mjs <Ordner von seed.mjs> [Starts]')
  process.exit(1)
}

/** Median; fehlende Messwerte (null) werden ausgelassen */
const median = (values) => {
  const sorted = values.filter((v) => typeof v === 'number').sort((a, b) => a - b)
  if (sorted.length === 0) return NaN
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Startet die App und gibt Steuerfunktionen zurück. */
async function launch(dataDir, storage) {
  const perfLines = []
  const port = 9400 + (launchCount++ % 500)
  const startedAt = Date.now()
  // Chromium drosselt Timer und Frames in versteckten oder verdeckten Fenstern (das
  // Fenster ist bis ready-to-show versteckt, und beim Messen liegt evtl. etwas darüber).
  // Ein Nutzer sieht sein Fenster – also für die Messung abschalten.
  const chromiumFlags = [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows'
  ]
  const child = spawn(ELECTRON, ['.', `--remote-debugging-port=${port}`, ...chromiumFlags], {
    cwd: ROOT,
    env: {
      ...process.env,
      FLUNGDO_DATA_DIR: dataDir,
      FLUNGDO_PERF: '1',
      FLUNGDO_STORAGE: storage
    }
  })
  const exited = new Promise((r) => child.once('exit', r))
  // Zeilenweise lesen: Ein Datenblock aus stdout kann mitten in einer Zeile enden
  createInterface({ input: child.stdout }).on('line', (line) => {
    const match = /^\[perf\] (\S+) ([\d.]+)$/.exec(line.trim())
    if (match) perfLines.push({ label: match[1], value: Number(match[2]) })
  })

  let page
  for (let i = 0; i < 100 && !page; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
      page = targets.find((t) => t.type === 'page')
    } catch {
      /* noch nicht bereit */
    }
    if (!page) await wait(100)
  }
  if (!page) throw new Error('App hat sich nicht gemeldet')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolveOpen, reject) => {
    ws.addEventListener('open', resolveOpen, { once: true })
    ws.addEventListener('error', () => reject(new Error('DevTools-Verbindung fehlgeschlagen')), {
      once: true
    })
  })
  let nextId = 0
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    pending.get(msg.id)?.(msg)
    pending.delete(msg.id)
  })
  // Bricht die Verbindung ab, sollen wartende Abfragen scheitern statt ewig zu hängen
  ws.addEventListener('close', () => {
    for (const handle of pending.values()) {
      handle({ result: { exceptionDetails: { text: 'DevTools-Verbindung geschlossen' } } })
    }
    pending.clear()
  })
  /** Führt JS im Fenster aus (darf ein Promise zurückgeben) und liefert das Ergebnis */
  const evaluate = (expression) =>
    new Promise((resolveResult, reject) => {
      const id = ++nextId
      pending.set(id, (msg) => {
        const result = msg.result
        const details = result?.exceptionDetails
        if (details) {
          const message = details.exception?.description ?? details.text
          reject(new Error(`${message}\n  bei: ${expression.slice(0, 200)}`))
        } else resolveResult(result?.result?.value)
      })
      ws.send(
        JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true }
        })
      )
    })

  /** Wartet auf die nächste [perf]-Zeile mit diesem Namen */
  const nextPerf = async (label, after) => {
    for (let i = 0; i < 100; i++) {
      const found = perfLines.slice(after).find((l) => l.label === label)
      if (found) return found.value
      await wait(50)
    }
    throw new Error(`Keine Messung "${label}", bisher: ${JSON.stringify(perfLines)}`)
  }

  const close = async () => {
    await evaluate('window.api.window.close()').catch(() => {})
    ws.close()
    await exited
  }

  return { startedAt, perfLines, evaluate, nextPerf, close }
}

// Im Fenster: bis zur sichtbaren Oberfläche mit Daten warten (ein Todo ist zu sehen)
// und den absoluten Zeitpunkt zurückgeben. MutationObserver meldet sich sofort, wenn
// React das erste Todo einfügt – ohne Abfrage per Timer.
const WAIT_FOR_UI = `new Promise((resolve) => {
  const found = () => document.querySelector('[role=checkbox]')
  const done = () => resolve(performance.timeOrigin + performance.now())
  if (found()) return done()
  const observer = new MutationObserver(() => {
    if (found()) {
      observer.disconnect()
      done()
    }
  })
  observer.observe(document, { childList: true, subtree: true })
})`

/** Millisekunden vom Programmstart bis zur sichtbaren Oberfläche mit Daten */
async function timeToUi(app) {
  // Ganz am Anfang ist noch about:blank geladen – wird die Abfrage durch das Laden der
  // App abgebrochen, kommt kein Ergebnis zurück. Dann einfach erneut fragen.
  for (let attempt = 0; attempt < 50; attempt++) {
    const visibleAt = await app.evaluate(WAIT_FOR_UI).catch(() => undefined)
    if (typeof visibleAt === 'number') return visibleAt - app.startedAt
    await wait(50)
  }
  throw new Error('Oberfläche wurde nicht sichtbar')
}

// Im Fenster: Klick auf einen Knopf und Zeit bis zum übernächsten Frame (= gezeichnet)
const clickAndPaint = (selectorJs) => `(async () => {
  const button = ${selectorJs}
  const start = performance.now()
  button.click()
  // Selten kommt kein Frame (z. B. Fenster kurz verdeckt) – dann nach 3 s ohne Messwert weiter
  const painted = await Promise.race([
    new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))),
    new Promise((r) => setTimeout(() => r(false), 3000))
  ])
  return painted ? performance.now() - start : null
})()`

// Im Fenster: erstes offenes Todo abhaken, 1,5 s lang "long tasks" (Hauptthread > 50 ms
// blockiert) sammeln und deren Gesamtdauer zurückgeben
const TOGGLE_AND_MEASURE_BLOCKING = `(async () => {
  const tasks = []
  const observer = new PerformanceObserver((list) => tasks.push(...list.getEntries()))
  observer.observe({ type: 'longtask' })
  document.querySelector('[role=checkbox][aria-checked=false]').click()
  await new Promise((r) => setTimeout(r, 1500))
  observer.disconnect()
  return tasks.reduce((sum, t) => sum + t.duration, 0)
})()`

const buttons = {
  day: `[...document.querySelectorAll('button')].find((b) => b.textContent === 'Tag')`,
  week: `[...document.querySelectorAll('button')].find((b) => b.textContent === 'Woche')`,
  month: `[...document.querySelectorAll('button')].find((b) => b.textContent === 'Monat')`,
  calendarWeek: `[...document.querySelectorAll('button')].filter((b) => b.textContent === 'Woche')[1]`
}

async function measureOne(seedFile, storage) {
  const dir = join(resolve(seedDir), 'runs', `${Date.now()}-${storage}`)
  await mkdir(dir, { recursive: true })
  await copyFile(seedFile, join(dir, 'todo-data.json'))

  // Erster Start: Bei SQLite wird hier die JSON übernommen – das zählt extra
  const first = await launch(dir, storage)
  const firstVisible = await timeToUi(first)
  await first.close()

  const startup = []
  const load = []
  const save = []
  const blocking = []
  const views = { day: [], week: [], month: [], calendarWeek: [] }
  for (let run = 0; run < starts; run++) {
    const app = await launch(dir, storage)
    startup.push(await timeToUi(app))
    load.push(await app.nextPerf('load', 0))

    if (run === 0) {
      // Speichern: ein Todo abhaken und wieder zurück; gemessen wird in Main (inkl. Prüfung)
      // Jedes Mal das erste offene Todo abhaken (oben stehen genug überfällige) und dabei
      // messen, wie lange der Renderer blockiert ist (Summe der "long tasks" > 50 ms).
      // Danach 1,5 s Ruhe: Die App hakt erst nach 450 ms wirklich ab und speichert 200 ms
      // später – kämen Klicks schneller, würden mehrere zu einem Speichern zusammengefasst.
      for (let i = 0; i < REPEAT; i++) {
        const before = app.perfLines.length
        blocking.push(await app.evaluate(TOGGLE_AND_MEASURE_BLOCKING))
        save.push(await app.nextPerf('save', before))
      }
      // Ansichten umschalten
      for (let i = 0; i < REPEAT; i++) {
        views.week.push(await app.evaluate(clickAndPaint(buttons.week)))
        views.day.push(await app.evaluate(clickAndPaint(buttons.day)))
        views.month.push(await app.evaluate(clickAndPaint(buttons.month)))
        views.calendarWeek.push(await app.evaluate(clickAndPaint(buttons.calendarWeek)))
      }
    }
    await app.close()
  }
  await rm(dir, { recursive: true, force: true })

  return {
    firstStart: firstVisible,
    startup: median(startup),
    load: median(load),
    save: median(save),
    blocking: median(blocking),
    day: median(views.day),
    week: median(views.week),
    month: median(views.month),
    calendarWeek: median(views.calendarWeek)
  }
}

const fmt = (ms) => `${Math.round(ms)} ms`

async function main() {
  const sizes = (await readdir(resolve(seedDir)))
    .filter((name) => /^\d+$/.test(name))
    .sort((a, b) => Number(a) - Number(b))
  const results = []
  for (const size of sizes) {
    for (const storage of ['json', 'sqlite']) {
      process.stdout.write(`${size} Todos, ${storage} … `)
      const result = await measureOne(join(resolve(seedDir), size, 'todo-data.json'), storage)
      results.push({ size: Number(size), storage, ...result })
      console.log('fertig')
    }
  }
  await writeFile(join(resolve(seedDir), 'results.json'), JSON.stringify(results, null, 2))

  console.log(
    '\n| Todos | Speicher | 1. Start | Start | Laden (Main) | Speichern (Main) | Abhaken blockiert UI | Tag | Woche | Monat | Kal.-Woche |'
  )
  console.log('|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
  for (const r of results) {
    console.log(
      `| ${r.size.toLocaleString('de-DE')} | ${r.storage === 'json' ? 'JSON' : 'SQLite'} | ${fmt(r.firstStart)} | ` +
        `${fmt(r.startup)} | ${fmt(r.load)} | ${fmt(r.save)} | ${fmt(r.blocking)} | ${fmt(r.day)} | ${fmt(r.week)} | ` +
        `${fmt(r.month)} | ${fmt(r.calendarWeek)} |`
    )
  }
}

await main()
