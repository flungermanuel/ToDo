import { readFile, rename, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { emptyAppData, type AppData } from '@shared/types'
import { migrate } from './migrations'
import type { Storage } from './Storage'

/**
 * Speichert alles in einer JSON-Datei.
 *
 * - Atomar: erst in eine .tmp-Datei schreiben, dann umbenennen. Stürzt die App
 *   mitten im Schreiben ab, bleibt die alte Datei heil.
 * - Nacheinander: Schreibvorgänge laufen in einer Warteschlange, damit sich zwei
 *   schnelle Saves nicht überholen.
 * - Robust: Ist die Datei unlesbar, wird sie als Backup beiseitegelegt und die
 *   App startet leer, statt abzustürzen.
 */
export class JsonStorage implements Storage {
  private queue: Promise<void> = Promise.resolve()

  constructor(private readonly filePath: string) {}

  async load(): Promise<AppData> {
    let text: string
    try {
      text = await readFile(this.filePath, 'utf-8')
    } catch (error) {
      if (isNotFound(error)) return emptyAppData()
      throw error
    }

    try {
      return migrate(JSON.parse(text))
    } catch (error) {
      const backup = `${this.filePath}.corrupt-${Date.now()}`
      await rename(this.filePath, backup)
      console.error(`Daten unlesbar, Backup unter ${backup}:`, error)
      return emptyAppData()
    }
  }

  save(data: AppData): Promise<void> {
    const write = async () => {
      await mkdir(dirname(this.filePath), { recursive: true })
      const tmp = `${this.filePath}.tmp`
      await writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
      await rename(tmp, this.filePath)
    }
    // Auch nach einem fehlgeschlagenen Save sollen spätere Saves noch laufen
    const next = this.queue.then(write, write)
    this.queue = next.catch(() => {})
    return next
  }

  flush(): Promise<void> {
    return this.queue
  }
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}
