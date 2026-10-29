import { copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Bis V1 hieß die App "todo" und hat ihre Daten in %APPDATA%/todo gespeichert.
 * Seit der Umbenennung in FlungDo liegt der Ordner woanders. Damit nichts verloren
 * geht, wird die alte Datei beim ersten Start einmalig kopiert (nicht verschoben –
 * das Original bleibt als Sicherheit liegen).
 */
export async function adoptLegacyFile(legacyPath: string, newPath: string): Promise<boolean> {
  if (await exists(newPath)) return false
  if (!(await exists(legacyPath))) return false
  await mkdir(dirname(newPath), { recursive: true })
  await copyFile(legacyPath, newPath)
  return true
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
