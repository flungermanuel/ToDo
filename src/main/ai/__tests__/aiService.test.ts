import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AiSettingsStore, isValidModel } from '../aiSettings'
import { createAiService, DEFAULT_MODEL, SETTINGS_FILE } from '../aiService'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'flungdo-ai-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('isValidModel', () => {
  it('akzeptiert übliche Modellnamen, lehnt Unsinn ab', () => {
    for (const ok of ['gemma3:4b', 'llama3.2:3b', 'library/qwen2.5:3b-instruct-q4_K_M']) {
      expect(isValidModel(ok), ok).toBe(true)
    }
    for (const bad of ['', ' ', 'a b', 'x\ny', 'a'.repeat(101), 5, null, undefined, '../x?']) {
      expect(isValidModel(bad), String(bad)).toBe(false)
    }
  })
})

describe('AiSettingsStore', () => {
  const file = () => join(dir, SETTINGS_FILE)

  it('nimmt ohne Datei das Standardmodell', async () => {
    expect((await AiSettingsStore.open(file(), 'std')).currentModel).toBe('std')
  })

  it('speichert die Wahl und liest sie beim nächsten Start wieder', async () => {
    const store = await AiSettingsStore.open(file(), 'std')
    await store.setModel('llama3.2:3b')
    expect(store.currentModel).toBe('llama3.2:3b')
    expect((await AiSettingsStore.open(file(), 'std')).currentModel).toBe('llama3.2:3b')
  })

  it('speichert nur das Modell – keine Eingaben, keine Antworten', async () => {
    const store = await AiSettingsStore.open(file(), 'std')
    await store.setModel('gemma3:4b')
    expect(JSON.parse(await readFile(file(), 'utf-8'))).toEqual({ model: 'gemma3:4b' })
  })

  it('weist ungültige Namen ab und behält das alte Modell', async () => {
    const store = await AiSettingsStore.open(file(), 'std')
    await expect(store.setModel('kaputt name')).rejects.toThrow()
    await expect(store.setModel(42)).rejects.toThrow()
    expect(store.currentModel).toBe('std')
  })

  it('übersteht eine kaputte oder unpassende Datei', async () => {
    for (const content of ['{ nope', '[]', 'null', '{"model": 5}', '{"model": "a b"}']) {
      await writeFile(file(), content)
      expect((await AiSettingsStore.open(file(), 'std')).currentModel, content).toBe('std')
    }
  })
})

describe('createAiService', () => {
  it('meldet Modell, Erreichbarkeit und installierte Modelle', async () => {
    const fetchFn = (async () =>
      json({ models: [{ name: 'gemma3:4b' }, { name: 'llama3.2:3b' }] })) as unknown as typeof fetch
    const ai = await createAiService(dir, {}, fetchFn)
    expect(await ai.status()).toEqual({
      provider: 'ollama',
      model: DEFAULT_MODEL,
      reachable: true,
      models: ['gemma3:4b', 'llama3.2:3b']
    })
  })

  it('meldet "nicht erreichbar", statt zu scheitern', async () => {
    const fetchFn = (async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    const ai = await createAiService(dir, {}, fetchFn)
    expect(await ai.status()).toEqual({
      provider: 'ollama',
      model: DEFAULT_MODEL,
      reachable: false,
      models: []
    })
  })

  it('nutzt nach setModel sofort das neue Modell – auch für die nächste Analyse', async () => {
    const bodies: string[] = []
    const fetchFn = (async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body))
      return json({ message: { content: '{"eintraege": []}' } })
    }) as unknown as typeof fetch
    const ai = await createAiService(dir, {}, fetchFn)

    await ai.setModel('llama3.2:3b')
    await ai.provider.extract({
      text: 'x',
      heute: '2026-10-29',
      wochentag: 'Donnerstag',
      kategorien: []
    })
    expect(JSON.parse(bodies[0]!).model).toBe('llama3.2:3b')
    expect((await ai.status()).model).toBe('llama3.2:3b')
  })

  it('FLUNGDO_AI_MODEL ersetzt das Standardmodell, FLUNGDO_AI=fake den Provider', async () => {
    const fetchFn = (async () => json({ models: [] })) as unknown as typeof fetch
    expect(
      (await (await createAiService(dir, { FLUNGDO_AI_MODEL: 'x:1b' }, fetchFn)).status()).model
    ).toBe('x:1b')

    const fake = await createAiService(dir, { FLUNGDO_AI: 'fake' })
    expect(fake.provider.name).toBe('fake')
    expect(await fake.status()).toMatchObject({ provider: 'fake', reachable: true })
  })
})
