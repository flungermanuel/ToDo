import { describe, expect, it } from 'vitest'
import { emptyAppData } from '@shared/types'
import type { ParsedEntry } from '@shared/capture'
import { testContext } from '../../__tests__/helpers'
import { createTodo } from '../../todos'
import {
  applyCards,
  canApply,
  cardIssue,
  cardsFromEntries,
  countCreated,
  fallbackCard,
  removeCreated,
  type CaptureCard
} from '../cards'

const categories = emptyAppData().categories // Studium (cat-studium), Persönlich (cat-persoenlich)

const entries: ParsedEntry[] = [
  { typ: 'deadline', titel: 'Abgabe Statistik', datumText: 'Freitag', datum: '2026-10-30', kategorie: 'studium' },
  { typ: 'todo', titel: 'Mama anrufen', datumText: '', datum: null, kategorie: 'Persönlich', prioritaet: 5 },
  { typ: 'pruefung', titel: 'Analysis', datumText: '12. Februar', datum: '2027-02-12', kategorie: 'Sport' }
] // prettier-ignore

describe('cardsFromEntries', () => {
  it('ordnet Kategorien zu (ohne Groß-/Kleinschreibung) und nimmt sonst die gewählte', () => {
    const cards = cardsFromEntries(entries, categories, 'cat-persoenlich', testContext())
    expect(cards.map((c) => c.categoryId)).toEqual([
      'cat-studium',
      'cat-persoenlich',
      'cat-persoenlich' // "Sport" gibt es nicht → gewählte Kategorie
    ])
    expect(cards.map((c) => c.prioritaet)).toEqual([3, 5, 3])
    expect(cards.every((c) => !c.mitTodo)).toBe(true)
    expect(new Set(cards.map((c) => c.key)).size).toBe(3)
  })
})

describe('fallbackCard', () => {
  it('macht den Rohtext zum Titel eines Todos ohne Datum', () => {
    const card = fallbackCard('  Zahnarzt   anrufen ', categories, 'cat-studium', testContext())
    expect(card).toMatchObject({ typ: 'todo', titel: 'Zahnarzt anrufen', datum: null })
    expect(card.categoryId).toBe('cat-studium')
  })

  it('kürzt zu lange Texte auf Titellänge', () => {
    expect(fallbackCard('a'.repeat(500), categories, undefined, testContext()).titel).toHaveLength(
      120
    )
  })
})

describe('cardIssue / canApply', () => {
  const base: CaptureCard = {
    key: 'k',
    typ: 'todo',
    titel: 'X',
    datum: null,
    categoryId: 'cat-studium',
    prioritaet: 3,
    mitTodo: false
  }

  it('Todo darf ohne Datum bleiben, Deadline und Prüfung brauchen eins', () => {
    expect(cardIssue(base)).toBeNull()
    expect(cardIssue({ ...base, typ: 'deadline' })).toBe('datum')
    expect(cardIssue({ ...base, typ: 'pruefung' })).toBe('datum')
    expect(cardIssue({ ...base, typ: 'pruefung', datum: '2026-02-30' })).toBe('datum')
    expect(cardIssue({ ...base, typ: 'pruefung', datum: '2027-02-12' })).toBeNull()
  })

  it('ein leerer Titel blockiert', () => {
    expect(cardIssue({ ...base, titel: '   ' })).toBe('titel')
  })

  it('übernehmen geht nur mit mindestens einer Karte und ohne offene Probleme', () => {
    expect(canApply([])).toBe(false)
    expect(canApply([base])).toBe(true)
    expect(canApply([base, { ...base, typ: 'deadline' }])).toBe(false)
  })
})

describe('applyCards', () => {
  it('legt Todo, Deadline und Prüfung über die Core-Funktionen an', () => {
    const cards = cardsFromEntries(
      entries,
      categories,
      'cat-studium',
      testContext('2026-10-29T08:00:00Z')
    )
    const { data, created } = applyCards(emptyAppData(), cards, testContext())

    expect(data.deadlines).toMatchObject([
      { titel: 'Abgabe Statistik', datum: '2026-10-30', prioritaet: 3 }
    ])
    expect(data.todos).toMatchObject([
      { titel: 'Mama anrufen', categoryId: 'cat-persoenlich', prioritaet: 5 }
    ])
    expect(data.todos[0]).not.toHaveProperty('datum')
    expect(data.exams).toMatchObject([{ titel: 'Analysis', datum: '2027-02-12' }])
    expect(countCreated(created)).toBe(3)
  })

  it('legt bei "Todo dazu" ein verknüpftes Todo ohne eigenes Datum an', () => {
    const [deadline] = cardsFromEntries([entries[0]!], categories, 'cat-studium', testContext())
    const { data, created } = applyCards(
      emptyAppData(),
      [{ ...deadline!, mitTodo: true }],
      testContext()
    )
    expect(data.deadlines).toHaveLength(1)
    expect(data.todos).toHaveLength(1)
    expect(data.todos[0]?.deadlineId).toBe(data.deadlines[0]?.id)
    expect(data.todos[0]).not.toHaveProperty('datum')
    expect(created.todos).toHaveLength(1)
    expect(created.deadlines).toHaveLength(1)
  })

  it('überspringt unvollständige Karten, statt Kaputtes anzulegen', () => {
    const [card] = cardsFromEntries([entries[0]!], categories, 'cat-studium', testContext())
    const { data, created } = applyCards(emptyAppData(), [{ ...card!, datum: null }], testContext())
    expect(data).toEqual(emptyAppData())
    expect(countCreated(created)).toBe(0)
  })
})

describe('removeCreated', () => {
  it('löscht genau die angelegten Einträge und lässt alles andere stehen', () => {
    const before = createTodo(
      emptyAppData(),
      { titel: 'Schon da' },
      testContext('2026-01-01T00:00:00Z')
    )
    const cards = cardsFromEntries(entries, categories, 'cat-studium', testContext())
    const { data, created } = applyCards(before, cards, testContext('2026-10-29T08:00:00Z'))

    // Zwischenzeitlich geändert: neues Todo dazu
    const changed = createTodo(
      data,
      { titel: 'Danach angelegt' },
      testContext('2026-10-30T00:00:00Z')
    )
    const undone = removeCreated(changed, created)

    expect(undone.todos.map((t) => t.titel)).toEqual(['Schon da', 'Danach angelegt'])
    expect(undone.deadlines).toEqual([])
    expect(undone.exams).toEqual([])
  })

  it('löst die Verknüpfung eines anderen Todos zu einer entfernten Deadline', () => {
    const [deadline] = cardsFromEntries([entries[0]!], categories, 'cat-studium', testContext())
    const { data, created } = applyCards(emptyAppData(), [deadline!], testContext())
    const deadlineId = data.deadlines[0]!.id
    const linked = createTodo(
      data,
      { titel: 'Eigenes', deadlineId },
      testContext('2026-10-30T00:00:00Z')
    )

    const undone = removeCreated(linked, created)
    expect(undone.deadlines).toEqual([])
    expect(undone.todos).toHaveLength(1)
    expect(undone.todos[0]).not.toHaveProperty('deadlineId')
  })
})
