import { describe, expect, it } from 'vitest'
import type { Card } from '../data/schema.ts'
import { addAnswer } from '../state/actions.ts'
import { buildPracticeSet, mistakeCardIds, practiceCandidates } from './practice.ts'
import { createDefaultState, type StoredState } from './storage.ts'

const cards: Card[] = Array.from({ length: 30 }, (_, i) => ({
  id: `c1-${String(i + 1).padStart(3, '0')}`,
  chapter: 1,
  type: 'true_false',
  section: '1.1',
  lo: 'FL-1.1.1',
  k: i < 10 ? 'K1' : 'K2',
  question: `Question ${i + 1}`,
  answer: true,
  tags: [],
}))

function answered(...entries: [string, boolean][]): StoredState {
  return entries.reduce(
    (state, [cardId, correct]) => addAnswer(state, { cardId, correct, mode: 'practice' }),
    createDefaultState(),
  )
}

describe('mistakeCardIds', () => {
  it('keeps only cards whose latest answer is wrong', () => {
    const state = answered(['c1-001', false], ['c1-002', false], ['c1-002', true], ['c1-003', true])
    expect(mistakeCardIds(state)).toEqual(new Set(['c1-001']))
  })

  it('takes review answers into account too', () => {
    const state = addAnswer(createDefaultState(), {
      cardId: 'c1-004',
      correct: false,
      mode: 'review',
      rating: 1,
    })
    expect(mistakeCardIds(state)).toEqual(new Set(['c1-004']))
  })
})

describe('practiceCandidates', () => {
  it('applies the filter, then the mistakes-only option', () => {
    const state = answered(['c1-001', false], ['c1-015', false])
    expect(practiceCandidates(state, { levels: ['K2'] }, false, cards)).toHaveLength(20)
    expect(practiceCandidates(state, { levels: ['K2'] }, true, cards).map((c) => c.id)).toEqual([
      'c1-015',
    ])
  })
})

describe('buildPracticeSet', () => {
  const state = createDefaultState()

  it('draws the requested number of distinct cards', () => {
    const ids = buildPracticeSet(state, {}, { size: 10, mistakesOnly: false }, Math.random, cards)
    expect(ids).toHaveLength(10)
    expect(new Set(ids).size).toBe(10)
  })

  it('returns every candidate for "all" or when fewer cards are available', () => {
    expect(
      buildPracticeSet(state, {}, { size: 'all', mistakesOnly: false }, Math.random, cards),
    ).toHaveLength(30)
    expect(
      buildPracticeSet(state, {}, { size: 50, mistakesOnly: false }, Math.random, cards),
    ).toHaveLength(30)
  })

  it('shuffles the cards', () => {
    const ids = buildPracticeSet(state, {}, { size: 'all', mistakesOnly: false }, () => 0, cards)
    expect(ids).not.toEqual(cards.map((card) => card.id))
    expect([...ids].sort()).toEqual(cards.map((card) => card.id))
  })

  it('returns nothing when there is no mistake to practice', () => {
    expect(
      buildPracticeSet(state, {}, { size: 10, mistakesOnly: true }, Math.random, cards),
    ).toEqual([])
  })
})
