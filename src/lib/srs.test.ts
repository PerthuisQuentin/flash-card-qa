import { describe, expect, it } from 'vitest'
import type { Card } from '../data/schema.ts'
import {
  applyReview,
  buildReviewQueue,
  createScheduler,
  deserializeCard,
  formatInterval,
  gradeFromOutcome,
  isCorrectGrade,
  isDue,
  localDay,
  newCardsLeftToday,
  nextDueDate,
  previewIntervals,
  Rating,
  serializeCard,
  shouldRequeue,
  State,
  type Grade,
} from './srs.ts'
import { createDefaultState, parseState, type StoredState } from './storage.ts'

/** Local dates, so day boundaries do not depend on the machine time zone. */
const at = (day: number, hour = 10, minute = 0) => new Date(2026, 9, day, hour, minute)

const fixtureCards: Card[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `c1-00${n}`,
  chapter: 1,
  type: 'true_false',
  section: '1.1',
  lo: 'FL-1.1.1',
  k: n % 2 ? 'K1' : 'K2',
  question: `Question ${n}`,
  answer: true,
  tags: [],
}))

function stateWith(newCardsPerDay = 20): StoredState {
  const state = createDefaultState()
  return { ...state, settings: { ...state.settings, newCardsPerDay } }
}

function review(state: StoredState, cardId: string, grade: Grade, now: Date): StoredState {
  const scheduler = createScheduler(state.settings, { fuzz: false })
  return applyReview(state, { cardId, grade, correct: isCorrectGrade(grade) }, now, scheduler)
}

describe('serialization', () => {
  it('round-trips an FSRS card', () => {
    const state = review(stateWith(), 'c1-001', Rating.Good, at(12))
    const data = state.srs['c1-001']
    expect(serializeCard(deserializeCard(data))).toEqual(data)
  })
})

describe('applyReview', () => {
  it('schedules a new card, counts it as introduced and logs the answer', () => {
    const now = at(12)
    const state = review(stateWith(), 'c1-001', Rating.Hard, now)

    expect(state.srs['c1-001'].state).toBe(State.Learning)
    expect(state.srs['c1-001'].reps).toBe(1)
    expect(state.newCardsIntroduced).toEqual({ [localDay(now)]: 1 })
    expect(state.answers).toEqual([
      { cardId: 'c1-001', at: now.toISOString(), correct: true, mode: 'review', rating: 2 },
    ])
    expect(parseState(state).ok).toBe(true)
  })

  it('does not count a card twice as introduced', () => {
    let state = review(stateWith(), 'c1-001', Rating.Again, at(12, 10))
    state = review(state, 'c1-001', Rating.Good, at(12, 10, 5))
    expect(state.newCardsIntroduced[localDay(at(12))]).toBe(1)
    expect(state.answers.map((answer) => answer.correct)).toEqual([false, true])
  })

  it('graduates a new card known at first sight straight to days', () => {
    const data = review(stateWith(), 'c1-001', Rating.Good, at(12, 10)).srs['c1-001']

    expect(data.state).toBe(State.Review)
    expect(new Date(data.due).getTime()).toBeGreaterThan(endOfDay(at(12)).getTime())
  })

  it('brings a missed card back once, 10 minutes later, then graduates it', () => {
    let state = review(stateWith(), 'c1-001', Rating.Again, at(12, 10))
    expect(state.srs['c1-001']).toMatchObject({
      state: State.Learning,
      due: at(12, 10, 10).toISOString(),
    })

    state = review(state, 'c1-001', Rating.Good, at(12, 10, 10))
    expect(state.srs['c1-001'].state).toBe(State.Review)
  })

  it('sends a forgotten review card to relearning', () => {
    let state = review(stateWith(), 'c1-001', Rating.Easy, at(1))
    expect(state.srs['c1-001'].state).toBe(State.Review)

    const due = new Date(state.srs['c1-001'].due)
    state = review(state, 'c1-001', Rating.Again, due)
    expect(state.srs['c1-001'].state).toBe(State.Relearning)
    expect(state.srs['c1-001'].lapses).toBe(1)
  })
})

describe('isDue', () => {
  it('treats review cards as due for the whole day', () => {
    const state = review(stateWith(), 'c1-001', Rating.Easy, at(1))
    const data = state.srs['c1-001']
    const due = new Date(data.due)
    const sameDayEarlier = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 0, 1)

    expect(isDue(data, sameDayEarlier)).toBe(true)
    expect(isDue(data, new Date(sameDayEarlier.getTime() - 2 * 60_000))).toBe(false)
  })

  it('treats learning cards as due only once their time has come', () => {
    const state = review(stateWith(), 'c1-001', Rating.Again, at(12, 10))
    const data = state.srs['c1-001']
    expect(data.state).toBe(State.Learning)
    expect(isDue(data, at(12, 10))).toBe(false)
    expect(isDue(data, at(12, 11))).toBe(true)
  })
})

describe('buildReviewQueue', () => {
  it('offers new cards in syllabus order within the daily quota', () => {
    expect(buildReviewQueue(stateWith(3), {}, at(12), fixtureCards)).toEqual({
      due: [],
      fresh: ['c1-001', 'c1-002', 'c1-003'],
    })
  })

  it('subtracts the new cards already introduced today', () => {
    let state = stateWith(3)
    state = review(state, 'c1-001', Rating.Easy, at(12, 9))
    state = review(state, 'c1-002', Rating.Easy, at(12, 9))

    expect(newCardsLeftToday(state, at(12, 11))).toBe(1)
    expect(buildReviewQueue(state, {}, at(12, 11), fixtureCards).fresh).toEqual(['c1-003'])
    // The quota resets the next day.
    expect(newCardsLeftToday(state, at(13))).toBe(3)
  })

  it('lists due cards, most overdue first', () => {
    let state = stateWith()
    state = review(state, 'c1-002', Rating.Easy, at(1))
    state = review(state, 'c1-001', Rating.Easy, at(2))
    state = review(state, 'c1-003', Rating.Again, at(20, 9)) // learning, due in minutes

    const later = new Date(2026, 11, 31)
    expect(buildReviewQueue(state, {}, later, fixtureCards).due).toEqual([
      'c1-002',
      'c1-001',
      'c1-003',
    ])
    expect(buildReviewQueue(state, {}, at(2, 11), fixtureCards).due).toEqual([])
  })

  it('applies the card filter', () => {
    const queue = buildReviewQueue(stateWith(), { levels: ['K2'] }, at(12), fixtureCards)
    expect(queue.fresh).toEqual(['c1-002', 'c1-004'])
  })

  it('returns nothing for a zero quota and no due cards', () => {
    expect(buildReviewQueue(stateWith(0), {}, at(12), fixtureCards)).toEqual({
      due: [],
      fresh: [],
    })
  })
})

describe('session helpers', () => {
  it('maps auto-graded outcomes to grades', () => {
    expect(gradeFromOutcome(false)).toBe(Rating.Again)
    expect(gradeFromOutcome(false, true)).toBe(Rating.Again)
    expect(gradeFromOutcome(true)).toBe(Rating.Good)
    expect(gradeFromOutcome(true, true)).toBe(Rating.Easy)
    expect(isCorrectGrade(Rating.Again)).toBe(false)
    expect(isCorrectGrade(Rating.Hard)).toBe(true)
  })

  it('requeues cards still learning today, not graduated ones', () => {
    const learning = review(stateWith(), 'c1-001', Rating.Again, at(12, 10))
    expect(shouldRequeue(learning.srs['c1-001'], at(12, 10))).toBe(true)

    const graduated = review(stateWith(), 'c1-001', Rating.Easy, at(12, 10))
    expect(shouldRequeue(graduated.srs['c1-001'], at(12, 10))).toBe(false)
  })

  it('previews each grade, in-session steps instead of minutes', () => {
    const scheduler = createScheduler(stateWith().settings, { fuzz: false })
    expect(previewIntervals(stateWith(), 'c1-001', at(12), scheduler)).toEqual({
      [Rating.Again]: 'dans la session',
      [Rating.Hard]: 'dans la session',
      [Rating.Good]: 'dans 2 j',
      [Rating.Easy]: 'dans 8 j',
    })
  })

  it('previews days for a card a few minutes before midnight', () => {
    const scheduler = createScheduler(stateWith().settings, { fuzz: false })
    const preview = previewIntervals(stateWith(), 'c1-001', at(12, 23, 55), scheduler)
    expect(preview[Rating.Again]).toBe('dans 10 min')
  })

  it('finds the next due date', () => {
    let state = review(stateWith(), 'c1-001', Rating.Easy, at(12))
    state = review(state, 'c1-002', Rating.Again, at(12))
    expect(nextDueDate(state, {}, at(12), fixtureCards)).toEqual(new Date(state.srs['c1-002'].due))
    expect(nextDueDate(stateWith(), {}, at(12), fixtureCards)).toBeUndefined()
  })
})

describe('formatInterval', () => {
  const from = at(12)
  const plus = (minutes: number) => new Date(from.getTime() + minutes * 60_000)

  it('formats short and long delays in French', () => {
    expect(formatInterval(from, plus(0))).toBe('1 min')
    expect(formatInterval(from, plus(10))).toBe('10 min')
    expect(formatInterval(from, plus(180))).toBe('3 h')
    expect(formatInterval(from, plus(4 * 1440))).toBe('4 j')
    expect(formatInterval(from, plus(61 * 1440))).toBe('2 mois')
    expect(formatInterval(from, plus(365 * 1440))).toBe('1 an')
    expect(formatInterval(from, plus(548 * 1440))).toBe('1,5 an')
    expect(formatInterval(from, plus(800 * 1440))).toBe('2,2 ans')
  })
})

function endOfDay(date: Date): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}
