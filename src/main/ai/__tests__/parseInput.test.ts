import { describe, expect, it } from 'vitest'
import type { CaptureContext } from '@shared/capture'
import { FakeProvider } from '../FakeProvider'
import { parseInput, MAX_INPUT_LENGTH } from '../parseInput'
import { AiError, type AiProvider } from '../Provider'

// Donnerstag, 29. Oktober 2026
const context: CaptureContext = {
  heute: '2026-10-29',
  kategorien: ['Studium', 'Persönlich'],
  aktuelleKategorie: 'Studium'
}

const EXAMPLE = 'Freitag Abgabe Statistik, Mama anrufen, Prüfung Analysis am 12. Februar'

describe('parseInput mit FakeProvider', () => {
  it('macht aus dem Beispielsatz drei Einträge mit aufgelösten Daten', async () => {
    const result = await parseInput(new FakeProvider(), EXAMPLE, context)
    expect(result).toEqual({
      status: 'ok',
      notices: [],
      entries: [
        {
          typ: 'deadline',
          titel: 'Abgabe Statistik',
          datumText: 'Freitag',
          datum: '2026-10-30',
          kategorie: 'Studium'
        },
        { typ: 'todo', titel: 'Mama anrufen', datumText: '', datum: null, kategorie: 'Persönlich' },
        {
          typ: 'pruefung',
          titel: 'Analysis',
          datumText: '12. Februar',
          datum: '2027-02-12',
          kategorie: 'Studium'
        }
      ]
    })
  })

  it('gibt dem Provider Datum, Wochentag und Kategorien mit', async () => {
    const provider = new FakeProvider()
    await parseInput(provider, `  ${EXAMPLE}  `, context)
    expect(provider.requests).toEqual([
      {
        text: EXAMPLE,
        heute: '2026-10-29',
        wochentag: 'Donnerstag',
        kategorien: ['Studium', 'Persönlich'],
        aktuelleKategorie: 'Studium'
      }
    ])
  })

  it('markiert ein nicht erkanntes Datum mit null, statt den Eintrag zu verwerfen', async () => {
    const provider = new FakeProvider({
      'Abgabe irgendwann': {
        eintraege: [{ typ: 'deadline', titel: 'Abgabe', datumText: 'irgendwann', kategorie: '' }]
      }
    })
    const result = await parseInput(provider, 'Abgabe irgendwann', context)
    expect(result.status === 'ok' && result.entries[0]).toMatchObject({
      typ: 'deadline',
      datumText: 'irgendwann',
      datum: null
    })
  })

  it('macht aus unbekanntem Text ein einzelnes Todo', async () => {
    const result = await parseInput(new FakeProvider(), 'Zahnarzt', context)
    expect(result).toMatchObject({
      status: 'ok',
      entries: [{ typ: 'todo', titel: 'Zahnarzt', datum: null }]
    })
  })

  it('liefert bei leerem Text nichts und fragt den Provider nicht', async () => {
    const provider = new FakeProvider()
    expect(await parseInput(provider, '   ', context)).toEqual({
      status: 'ok',
      entries: [],
      notices: []
    })
    expect(provider.requests).toHaveLength(0)
  })

  it('reicht Hinweise der Validierung weiter und behält die guten Einträge', async () => {
    const provider = new FakeProvider({
      Mix: {
        eintraege: [
          { typ: 'todo', titel: 'Gut', datumText: 'morgen', kategorie: '' },
          { typ: 'quatsch', titel: 'Schlecht' }
        ]
      }
    })
    const result = await parseInput(provider, 'Mix', context)
    expect(result.status === 'ok' && result.entries.map((e) => e.titel)).toEqual(['Gut'])
    expect(result.status === 'ok' && result.notices).toHaveLength(1)
  })

  it('lehnt zu lange Eingaben ab, ohne den Provider zu fragen', async () => {
    const provider = new FakeProvider()
    const result = await parseInput(provider, 'a'.repeat(MAX_INPUT_LENGTH + 1), context)
    expect(result).toMatchObject({ status: 'error', error: { kind: 'too-long' } })
    expect(provider.requests).toHaveLength(0)
  })

  it('lehnt ein ungültiges heutiges Datum ab', async () => {
    const result = await parseInput(new FakeProvider(), 'x', { ...context, heute: 'gestern' })
    expect(result).toMatchObject({ status: 'error', error: { kind: 'failed' } })
  })
})

describe('Fehler und Wiederholung', () => {
  /** Provider, der nacheinander die vorbereiteten Antworten bzw. Fehler liefert */
  function scripted(...steps: Array<unknown | Error>): AiProvider & { calls: number } {
    return {
      name: 'scripted',
      calls: 0,
      async extract() {
        const step = steps[Math.min(this.calls++, steps.length - 1)]
        if (step instanceof Error) throw step
        return step
      }
    }
  }

  const good = { eintraege: [{ typ: 'todo', titel: 'Ok', datumText: '', kategorie: '' }] }

  it('wiederholt genau einmal, wenn die Antwort die falsche Form hat', async () => {
    const provider = scripted('kein json', good)
    const result = await parseInput(provider, 'x', context)
    expect(result.status).toBe('ok')
    expect(provider.calls).toBe(2)
  })

  it('wiederholt auch, wenn der Provider "invalid" meldet', async () => {
    const provider = scripted(new AiError('invalid', 'kaputt'), good)
    expect((await parseInput(provider, 'x', context)).status).toBe('ok')
    expect(provider.calls).toBe(2)
  })

  it('gibt nach dem zweiten ungültigen Versuch einen Fehler zurück', async () => {
    const provider = scripted('nein', 'immer noch nein', good)
    const result = await parseInput(provider, 'x', context)
    expect(result).toMatchObject({ status: 'error', error: { kind: 'invalid' } })
    expect(provider.calls).toBe(2)
  })

  it('eine leere Liste ist eine gültige Antwort ("keine Aufgabe") und wird nicht wiederholt', async () => {
    const provider = scripted({ eintraege: [] })
    expect(await parseInput(provider, 'Hallo', context)).toEqual({
      status: 'ok',
      entries: [],
      notices: []
    })
    expect(provider.calls).toBe(1)
  })

  it('wiederholt andere Fehler nicht und gibt Art und Meldung weiter', async () => {
    for (const kind of ['unreachable', 'model-missing', 'timeout'] as const) {
      const provider = scripted(new AiError(kind, `Meldung ${kind}`))
      expect(await parseInput(provider, 'x', context)).toEqual({
        status: 'error',
        error: { kind, message: `Meldung ${kind}` }
      })
      expect(provider.calls).toBe(1)
    }
  })

  it('verrät bei unerwarteten Fehlern keine Details', async () => {
    const provider = scripted(new Error('geheimer Eingabetext im Fehler'))
    const result = await parseInput(provider, 'x', context)
    expect(result).toEqual({
      status: 'error',
      error: { kind: 'failed', message: 'Die Analyse ist fehlgeschlagen.' }
    })
  })

  it('bricht ab, wenn der Nutzer abbricht', async () => {
    const controller = new AbortController()
    const provider = new FakeProvider({}, { delayMs: 5000 })
    const pending = parseInput(provider, 'x', context, controller.signal)
    controller.abort()
    expect(await pending).toEqual({
      status: 'error',
      error: { kind: 'canceled', message: 'Abgebrochen' }
    })
  })

  it('zeigt, was der FakeProvider an Fehlern liefern soll', async () => {
    const provider = new FakeProvider(
      {},
      { fail: new AiError('unreachable', 'Ollama läuft nicht') }
    )
    expect(await parseInput(provider, 'x', context)).toMatchObject({
      status: 'error',
      error: { kind: 'unreachable' }
    })
  })
})
