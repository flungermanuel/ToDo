import { mkdir, open, rename } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Schreibt eine Datei so, dass sie danach entweder komplett alt oder komplett neu ist –
 * nie halb geschrieben.
 *
 * 1. Inhalt in eine Temp-Datei im selben Ordner schreiben (gleiches Laufwerk → Umbenennen ist atomar)
 * 2. fsync: Windows/Node sollen die Daten wirklich auf die Platte schreiben, bevor wir umbenennen.
 *    Sonst kann nach einem Stromausfall der neue Name schon da sein, der Inhalt aber noch nicht.
 * 3. Temp-Datei über die echte Datei umbenennen
 */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp`
  const handle = await open(tmp, 'w')
  try {
    await handle.writeFile(content, 'utf-8')
    await handle.sync()
  } finally {
    await handle.close()
  }
  await renameWithRetry(tmp, filePath)
}

// Unter Windows halten Virenscanner, Indexdienst oder Cloud-Sync eine Datei manchmal
// für Millisekunden offen. Umbenennen scheitert dann mit EPERM/EBUSY/EACCES – ein
// kurzer zweiter Versuch klappt fast immer.
const RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES'])
const RETRY_DELAYS_MS = [20, 60, 150]

export async function renameWithRetry(
  from: string,
  to: string,
  renameFn: (from: string, to: string) => Promise<void> = rename
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await renameFn(from, to)
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code
      const delay = RETRY_DELAYS_MS[attempt]
      if (!code || !RETRY_CODES.has(code) || delay === undefined) throw error
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
