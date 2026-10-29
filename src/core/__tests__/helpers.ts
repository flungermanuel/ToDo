import type { CoreContext } from '../context'

/** Vorhersagbarer Kontext: IDs id-1, id-2 … und eine feste, steigende Uhrzeit. */
export function testContext(start = '2026-10-29T08:00:00.000Z'): CoreContext {
  let n = 0
  let t = new Date(start).getTime()
  return {
    newId: () => `id-${++n}`,
    now: () => new Date((t += 1000))
  }
}
