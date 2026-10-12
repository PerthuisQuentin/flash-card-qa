import { describe, expect, it } from 'vitest'
import rawData from './cards.json'
import {
  cards,
  cardsOfChapter,
  filterCards,
  getCard,
  listLearningObjectives,
  listTags,
} from './cards.ts'
import { cardsFileSchema, findDataErrors, type Card, type CardsFile } from './schema.ts'

describe('cards.json', () => {
  it('matches the schema', () => {
    const result = cardsFileSchema.safeParse(rawData)
    expect(result.success ? [] : result.error.issues).toEqual([])
  })

  it('passes cross-field checks', () => {
    expect(findDataErrors(cardsFileSchema.parse(rawData))).toEqual([])
  })
})

describe('findDataErrors', () => {
  const chapter = { id: 1, title: 'Chapitre', examQuestions: 8 }
  const base = {
    chapter: 1,
    section: '1.1',
    lo: 'FL-1.1.1',
    k: 'K1',
    question: 'Question ?',
    tags: [] as string[],
  } as const
  const mcq = (id: string, correct: number[], options = ['A', 'B', 'C']): Card => ({
    ...base,
    id,
    type: 'mcq',
    options,
    correct,
  })
  const file = (...cards: Card[]): CardsFile => ({ chapters: [chapter], cards })

  it('accepts a valid file', () => {
    expect(findDataErrors(file(mcq('c1-001', [0]), mcq('c1-002', [1, 2])))).toEqual([])
  })

  it('detects duplicate card ids', () => {
    expect(findDataErrors(file(mcq('c1-001', [0]), mcq('c1-001', [1])))).toEqual([
      'Duplicate card id c1-001',
    ])
  })

  it('detects an id prefix that does not match the chapter', () => {
    expect(findDataErrors(file(mcq('c2-001', [0])))).toContain(
      'c2-001: id prefix does not match chapter 1',
    )
  })

  it('detects an unknown chapter', () => {
    const card: Card = { ...mcq('c9-001', [0]), chapter: 9, lo: 'FL-9.1.1' }
    expect(findDataErrors(file(card))).toEqual(['c9-001: unknown chapter 9'])
  })

  it('detects a learning objective from another chapter', () => {
    const card: Card = { ...mcq('c1-001', [0]), lo: 'FL-2.1.1' }
    expect(findDataErrors(file(card))).toEqual(['c1-001: lo FL-2.1.1 does not belong to chapter 1'])
  })

  it('detects invalid mcq answers', () => {
    expect(findDataErrors(file(mcq('c1-001', [3])))).toEqual([
      'c1-001: correct index 3 out of range',
    ])
    expect(findDataErrors(file(mcq('c1-001', [1, 1])))).toEqual([
      'c1-001: duplicate index in correct',
    ])
    expect(findDataErrors(file(mcq('c1-001', [0], ['A', 'A'])))).toEqual([
      'c1-001: duplicate options',
    ])
  })

  it('detects duplicate ordering items', () => {
    const card: Card = { ...base, id: 'c1-001', type: 'ordering', items: ['A', 'A'] }
    expect(findDataErrors(file(card))).toEqual(['c1-001: duplicate items'])
  })
})

describe('cardsFileSchema', () => {
  it('rejects unknown fields (typo protection)', () => {
    const data = {
      chapters: [{ id: 1, title: 'Chapitre', examQuestions: 8 }],
      cards: [
        {
          id: 'c1-001',
          chapter: 1,
          type: 'true_false',
          section: '1.1',
          lo: 'FL-1.1.1',
          k: 'K1',
          question: 'Question ?',
          answer: true,
          tags: [],
          explantion: 'typo',
        },
      ],
    }
    expect(cardsFileSchema.safeParse(data).success).toBe(false)
  })

  it('rejects an mcq without correct answer', () => {
    const data = {
      chapters: [{ id: 1, title: 'Chapitre', examQuestions: 8 }],
      cards: [
        {
          id: 'c1-001',
          chapter: 1,
          type: 'mcq',
          section: '1.1',
          lo: 'FL-1.1.1',
          k: 'K1',
          question: 'Question ?',
          options: ['A', 'B'],
          correct: [],
          tags: [],
        },
      ],
    }
    expect(cardsFileSchema.safeParse(data).success).toBe(false)
  })
})

describe('card helpers', () => {
  it('finds a card by id', () => {
    expect(getCard('c1-001')?.chapter).toBe(1)
    expect(getCard('does-not-exist')).toBeUndefined()
  })

  it('groups cards by chapter', () => {
    expect(cardsOfChapter(1).length).toBeGreaterThan(0)
    expect(cardsOfChapter(1).every((card) => card.chapter === 1)).toBe(true)
  })

  it('treats empty filter criteria as no restriction', () => {
    expect(filterCards({})).toHaveLength(cards.length)
    expect(filterCards({ chapters: [], levels: [], tags: [], los: [] })).toHaveLength(cards.length)
  })

  it('combines criteria with AND, and tags with OR', () => {
    const result = filterCards({ chapters: [1], levels: ['K1'], tags: ['piège', 'scénario'] })
    expect(result.length).toBeGreaterThan(0)
    for (const card of result) {
      expect(card.chapter).toBe(1)
      expect(card.k).toBe('K1')
      expect(card.tags.some((tag) => tag === 'piège' || tag === 'scénario')).toBe(true)
    }
  })

  it('filters by learning objective', () => {
    const result = filterCards({ los: ['FL-1.3.1'] })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((card) => card.lo === 'FL-1.3.1')).toBe(true)
  })

  it('lists tags and learning objectives sorted', () => {
    const tags = listTags()
    expect(tags).toContain('piège')
    expect([...tags].sort((a, b) => a.localeCompare(b, 'fr'))).toEqual(tags)

    const los = listLearningObjectives()
    expect(los[0]).toBe('FL-1.1.1')
    expect(los).toContain('FL-1.5.3')
  })
})
