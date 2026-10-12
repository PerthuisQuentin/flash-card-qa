import { describe, expect, it } from 'vitest'
import type { McqCard, OrderingCard, TrueFalseCard } from '../data/schema.ts'
import {
  gradeMcq,
  gradeOrdering,
  gradeTrueFalse,
  isMultiAnswer,
  moveItem,
  shuffle,
  shuffleOrdering,
} from './grading.ts'

const base = {
  id: 'c1-001',
  chapter: 1,
  section: '1.1',
  lo: 'FL-1.1.1',
  k: 'K1' as const,
  question: 'Question ?',
  tags: [],
}

const singleMcq: McqCard = { ...base, type: 'mcq', options: ['A', 'B', 'C', 'D'], correct: [2] }
const multiMcq: McqCard = { ...base, type: 'mcq', options: ['A', 'B', 'C', 'D'], correct: [0, 3] }
const trueFalse: TrueFalseCard = { ...base, type: 'true_false', answer: false }
const ordering: OrderingCard = { ...base, type: 'ordering', items: ['1', '2', '3', '4'] }

/** Deterministic pseudo-random generator for reproducible shuffles. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}

describe('gradeMcq', () => {
  it('grades a single-answer question', () => {
    expect(gradeMcq(singleMcq, [2])).toBe(true)
    expect(gradeMcq(singleMcq, [1])).toBe(false)
    expect(gradeMcq(singleMcq, [])).toBe(false)
    expect(gradeMcq(singleMcq, [1, 2])).toBe(false)
  })

  it('requires the exact set for a multi-answer question', () => {
    expect(gradeMcq(multiMcq, [0, 3])).toBe(true)
    expect(gradeMcq(multiMcq, [3, 0])).toBe(true)
    expect(gradeMcq(multiMcq, [0])).toBe(false)
    expect(gradeMcq(multiMcq, [0, 2, 3])).toBe(false)
    expect(gradeMcq(multiMcq, [0, 0])).toBe(false)
  })

  it('detects multi-answer questions', () => {
    expect(isMultiAnswer(singleMcq)).toBe(false)
    expect(isMultiAnswer(multiMcq)).toBe(true)
  })
})

describe('gradeTrueFalse', () => {
  it('compares with the expected answer', () => {
    expect(gradeTrueFalse(trueFalse, false)).toBe(true)
    expect(gradeTrueFalse(trueFalse, true)).toBe(false)
    expect(gradeTrueFalse(trueFalse, null)).toBe(false)
  })
})

describe('gradeOrdering', () => {
  it('accepts only the exact order', () => {
    expect(gradeOrdering(ordering, ['1', '2', '3', '4'])).toBe(true)
    expect(gradeOrdering(ordering, ['2', '1', '3', '4'])).toBe(false)
    expect(gradeOrdering(ordering, ['1', '2', '3'])).toBe(false)
  })
})

describe('shuffle', () => {
  it('keeps the same elements and does not mutate the input', () => {
    const input = ['a', 'b', 'c', 'd', 'e']
    const result = shuffle(input, seeded(42))
    expect([...result].sort()).toEqual(input)
    expect(input).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('shuffleOrdering', () => {
  it('never returns the correct order', () => {
    for (let seed = 0; seed < 500; seed++) {
      for (const items of [['a', 'b'], ['a', 'b', 'c'], ordering.items]) {
        const result = shuffleOrdering(items, seeded(seed))
        expect([...result].sort()).toEqual([...items].sort())
        expect(result).not.toEqual(items)
      }
    }
  })

  it('fixes an identity shuffle by swapping the first two items', () => {
    // random() = 0.999… keeps every element in place with Fisher–Yates.
    expect(shuffleOrdering(['a', 'b', 'c'], () => 0.9999)).toEqual(['b', 'a', 'c'])
  })
})

describe('moveItem', () => {
  it('moves an item to a new position', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('ignores out-of-range moves', () => {
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b'])
  })
})
