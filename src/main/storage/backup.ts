import { copyFile, readdir, rm } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'

/** So viele Sicherungen pro Datei bleiben liegen, ältere werden gelöscht. */
export const MAX_BACKUPS = 5

/**
 * Legt eine Kopie neben der Datei an, z. B. vor einer Migration oder einem Import:
 *   todo-data.json → todo-data.backup-v3-20261109T123456789.json
 *
 * Der Grund (`tag`, z. B. "v3" oder "import") steht im Namen, damit man die
 * richtige Sicherung wiederfindet. Der Zeitstempel macht jeden Namen eindeutig und
 * bestimmt, welche Sicherungen die neuesten sind.
 */
export async function createBackup(
  filePath: string,
  tag: string,
  now: Date = new Date()
): Promise<string> {
  const target = join(dirname(filePath), backupName(filePath, tag, now))
  await copyFile(filePath, target)
  await pruneBackups(filePath)
  return target
}

export function backupName(filePath: string, tag: string, now: Date): string {
  const ext = extname(filePath)
  const base = basename(filePath, ext)
  return `${base}.backup-${tag}-${timestamp(now)}${ext}`
}

/** Löscht alle Sicherungen der Datei bis auf die neuesten MAX_BACKUPS. */
export async function pruneBackups(filePath: string): Promise<void> {
  const backups = await listBackups(filePath)
  const old = backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS))
  await Promise.all(old.map((name) => rm(join(dirname(filePath), name), { force: true })))
}

/** Sicherungen der Datei, älteste zuerst. */
export async function listBackups(filePath: string): Promise<string[]> {
  const ext = extname(filePath)
  const prefix = `${basename(filePath, ext)}.backup-`
  const names = await readdir(dirname(filePath))
  return names
    .map((name) => ({ name, stamp: stampOf(name, prefix, ext) }))
    .filter((b): b is { name: string; stamp: string } => b.stamp !== null)
    .sort((a, b) => a.stamp.localeCompare(b.stamp))
    .map((b) => b.name)
}

// Sortiert der Name nicht nach Datum, weil der Grund davor steht ("v1" vs. "import").
// Deshalb wird der Zeitstempel am Ende herausgelöst.
function stampOf(name: string, prefix: string, ext: string): string | null {
  if (!name.startsWith(prefix) || !name.endsWith(ext)) return null
  const match = /-(\d{8}T\d{9})$/.exec(name.slice(0, name.length - ext.length))
  return match ? match[1]! : null
}

/** 20261109T123456789 – lokale Zeit, sortierbar, ohne Zeichen, die Windows verbietet */
function timestamp(d: Date): string {
  const p = (n: number, len = 2) => String(n).padStart(len, '0')
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${p(d.getMilliseconds(), 3)}`
  )
}
