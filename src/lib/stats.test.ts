import { describe, expect, it } from 'vitest'
import type { Card, Chapter } from '../data/schema.ts'
import { applyReview, createScheduler, Rating, type Grade } from './srs.ts'
import { chapterProgress, streak, todaySummary } from './stats.ts'
import { createDefaultState, type StoredState } from './storage.ts'

const at = (day: number, hour = 10) => new Date(2026, 9, day, hour)

const chapters: Chapter[] = [
  { id: 1, title: 'Un', examQuestions: 8 },
  { id: 2, title: 'Deux', examQuestions: 6 },
  { id: 3, title: 'Trois', examQuestions: 4 },
]

const card = (id: string, chapter: number): Card => ({
  id,
  chapter,
  type: 'true_false',
  section: `${chapter}.1`,
  lo: `FL-${chapter}.1.1`,
  k: 'K1',
  question: id,
  answer: true,
  tags: [],
})

const cards = [card('c1-001', 1), card('c1-002', 1), card('c1-003', 1), card('c2-001', 2)]

function review(state: StoredState, cardId: string, grade: Grade, now: Date): StoredState {
  const scheduler = createScheduler(state.settings, { fuzz: false })
  return applyReview(state, { cardId, grade, correct: grade !== Rating.Again }, now, scheduler)
}

function answeredOn(...days: Date[]): StoredState {
  return {
    ...createDefaultState(),
    answers: days.map((date) => ({
      cardId: 'c1-001',
      at: date.toISOString(),
      correct: true,
      mode: 'practice' as const,
    })),
  }
}

describe('chapterProgress', () => {
  it('counts fresh, learning, review and due cards per chapter', () => {
    let state = createDefaultState()
    state = review(state, 'c1-001', Rating.Easy, at(1)) // review, due days later
    state = review(state, 'c1-002', Rating.Again, at(12, 9)) // learning, due in minutes

    const [ch1, ch2, ch3] = chapterProgress(state, at(12, 11), chapters, cards)

    expect(ch1).toMatchObject({ total: 3, fresh: 1, learning: 1, review: 1, due: 2 })
    expect(ch2).toMatchObject({ total: 1, fresh: 1, learning: 0, review: 0, due: 0 })
    expect(ch3).toMatchObject({ total: 0, fresh: 0, learning: 0, review: 0, due: 0 })
  })
})

describe('todaySummary', () => {
  it('limits new cards by the remaining quota', () => {
    const base = createDefaultState()
    const state = { ...base, settings: { ...base.settings, newCardsPerDay: 2 } }
    expect(todaySummary(state, at(12), cards)).toEqual({ due: 0, fresh: 2, answeredToday: 0 })
  })

  it('limits new cards by the cards left', () => {
    expect(todaySummary(createDefaultState(), at(12), cards).fresh).toBe(4)
  })

  it('counts due cards and answers of the local day', () => {
    let state = review(createDefaultState(), 'c1-001', Rating.Again, at(12, 9))
    state = review(state, 'c1-002', Rating.Good, at(11, 9))
    expect(todaySummary(state, at(12, 11), cards)).toEqual({
      due: 2,
      fresh: 2,
      answeredToday: 1,
    })
  })
})

describe('streak', () => {
  it('is zero without any answer', () => {
    expect(streak(createDefaultState(), at(12))).toEqual({ days: 0, activeToday: false })
  })

  it('counts consecutive days ending today', () => {
    const state = answeredOn(at(10), at(11), at(12, 8), at(12, 20), at(8))
    expect(streak(state, at(12, 22))).toEqual({ days: 3, activeToday: true })
  })

  it('keeps yesterday’s streak alive until today ends', () => {
    expect(streak(answeredOn(at(10), at(11)), at(12))).toEqual({ days: 2, activeToday: false })
  })

  it('is broken after a full day without answers', () => {
    expect(streak(answeredOn(at(9), at(10)), at(12))).toEqual({ days: 0, activeToday: false })
  })

  it('handles month boundaries', () => {
    const state = answeredOn(new Date(2026, 8, 30, 10), at(1))
    expect(streak(state, at(1, 12)).days).toBe(2)
  })
})
