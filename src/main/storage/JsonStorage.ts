import { readFile, rename } from 'node:fs/promises'
import { CURRENT_VERSION, emptyAppData, type AppData } from '@shared/types'
import { writeFileAtomic } from './atomicWrite'
import { createBackup } from './backup'
import { migrate } from './migrations'
import type { Storage } from './Storage'

/**
 * Speichert alles in einer JSON-Datei.
 *
 * - Atomar: erst in eine .tmp-Datei schreiben, auf die Platte zwingen, dann umbenennen
 *   (siehe atomicWrite.ts). Stürzt die App mitten im Schreiben ab, bleibt die alte Datei heil.
 * - Nacheinander: Schreibvorgänge laufen in einer Warteschlange, damit sich zwei
 *   schnelle Saves nicht überholen.
 * - Gesichert: Vor einer Migration auf ein neues Format wird die alte Datei kopiert.
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

    let raw: unknown
    let data: AppData
    try {
      raw = JSON.parse(text)
      data = migrate(raw)
    } catch (error) {
      const backup = `${this.filePath}.corrupt-${Date.now()}`
      await rename(this.filePath, backup)
      console.error(`Daten unlesbar, Backup unter ${backup}:`, error)
      return emptyAppData()
    }

    // Ältere Version: vor dem Überschreiben das Original sichern, dann den migrierten
    // Stand sofort speichern – so wird nur einmal gesichert, nicht bei jedem Start.
    // Scheitert die Sicherung, bricht das Laden ab, statt ungesichert umzuschreiben.
    const version = (raw as { version: number }).version
    if (version < CURRENT_VERSION) {
      await createBackup(this.filePath, `v${version}`)
      await this.save(data)
    }
    return data
  }

  save(data: AppData): Promise<void> {
    const write = () => writeFileAtomic(this.filePath, JSON.stringify(data, null, 2))
    // Auch nach einem fehlgeschlagenen Save sollen spätere Saves noch laufen
    const next = this.queue.then(write, write)
    this.queue = next.catch(() => {})
    return next
  }

  flush(): Promise<void> {
    return this.queue
  }

  async backup(tag: string): Promise<string | null> {
    await this.flush()
    try {
      return await createBackup(this.filePath, tag)
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}
