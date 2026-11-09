import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renameWithRetry, writeFileAtomic } from '../atomicWrite'

function errno(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code })
}

describe('writeFileAtomic', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'flungdo-atomic-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('schreibt den Inhalt, legt fehlende Ordner an und lässt keine .tmp-Datei zurück', async () => {
    const file = join(dir, 'sub', 'data.json')
    await writeFileAtomic(file, 'Hallo 👋')
    await writeFileAtomic(file, 'Neu')
    expect(await readFile(file, 'utf-8')).toBe('Neu')
    expect(await readdir(join(dir, 'sub'))).toEqual(['data.json'])
  })
})

describe('renameWithRetry', () => {
  it('versucht es bei EPERM/EBUSY erneut, bis es klappt', async () => {
    const rename = vi
      .fn<(a: string, b: string) => Promise<void>>()
      .mockRejectedValueOnce(errno('EPERM'))
      .mockRejectedValueOnce(errno('EBUSY'))
      .mockResolvedValueOnce()
    await renameWithRetry('a', 'b', rename)
    expect(rename).toHaveBeenCalledTimes(3)
  })

  it('gibt nach einigen Versuchen auf', async () => {
    const rename = vi
      .fn<(a: string, b: string) => Promise<void>>()
      .mockRejectedValue(errno('EPERM'))
    await expect(renameWithRetry('a', 'b', rename)).rejects.toThrow('EPERM')
    expect(rename).toHaveBeenCalledTimes(4)
  })

  it('wiederholt andere Fehler nicht', async () => {
    const rename = vi
      .fn<(a: string, b: string) => Promise<void>>()
      .mockRejectedValue(errno('ENOENT'))
    await expect(renameWithRetry('a', 'b', rename)).rejects.toThrow('ENOENT')
    expect(rename).toHaveBeenCalledTimes(1)
  })
})
