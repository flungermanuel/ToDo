// Zeitmessung für docs/performance.md. Nur aktiv mit FLUNGDO_PERF=1, sonst kostet sie nichts.
// Die Zeilen beginnen mit "[perf]", damit scripts/measure.mjs sie aus der Ausgabe lesen kann.

const enabled = process.env['FLUNGDO_PERF'] === '1'

/** Zeitpunkt seit Prozessstart, z. B. "[perf] ready-to-show 812.4" */
export function perfMark(label: string): void {
  if (enabled) console.log(`[perf] ${label} ${performance.now().toFixed(1)}`)
}

/** Misst, wie lange `fn` dauert, z. B. "[perf] save 3.2" */
export async function perfTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!enabled) return fn()
  const start = performance.now()
  try {
    return await fn()
  } finally {
    console.log(`[perf] ${label} ${(performance.now() - start).toFixed(1)}`)
  }
}
