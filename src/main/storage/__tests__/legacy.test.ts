import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { adoptLegacyFile } from '../legacy'

describe('adoptLegacyFile', () => {
  let dir: string
  let legacy: string
  let target: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'todo-legacy-'))
    legacy = join(dir, 'todo', 'todo-data.json')
    target = join(dir, 'FlungDo', 'todo-data.json')
    await mkdir(join(dir, 'todo'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('kopiert die alte Datei, wenn es noch keine neue gibt', async () => {
    await writeFile(legacy, 'alt')
    expect(await adoptLegacyFile(legacy, target)).toBe(true)
    expect(await readFile(target, 'utf-8')).toBe('alt')
    // Original bleibt als Sicherheit erhalten
    expect(await readFile(legacy, 'utf-8')).toBe('alt')
  })

  it('überschreibt nie eine vorhandene neue Datei', async () => {
    await writeFile(legacy, 'alt')
    await mkdir(join(dir, 'FlungDo'))
    await writeFile(target, 'neu')
    expect(await adoptLegacyFile(legacy, target)).toBe(false)
    expect(await readFile(target, 'utf-8')).toBe('neu')
  })

  it('macht nichts, wenn es keine alte Datei gibt', async () => {
    expect(await adoptLegacyFile(legacy, target)).toBe(false)
  })
})
