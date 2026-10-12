import { cards as allCards, chapters as allChapters } from '../data/cards.ts'
import type { Card, Chapter } from '../data/schema.ts'
import { isDue, localDay, newCardsLeftToday, State } from './srs.ts'
import type { StoredState } from './storage.ts'

export interface ChapterProgress {
  chapter: Chapter
  total: number
  /** Never reviewed. */
  fresh: number
  /** In learning or relearning steps. */
  learning: number
  /** Graduated to day-based review. */
  review: number
  due: number
}

export function chapterProgress(
  state: StoredState,
  now: Date,
  chapters: readonly Chapter[] = allChapters,
  cards: readonly Card[] = allCards,
): ChapterProgress[] {
  return chapters.map((chapter) => {
    const progress: ChapterProgress = {
      chapter,
      total: 0,
      fresh: 0,
      learning: 0,
      review: 0,
      due: 0,
    }
    for (const card of cards) {
      if (card.chapter !== chapter.id) continue
      progress.total++
      const data = state.srs[card.id]
      if (!data) {
        progress.fresh++
        continue
      }
      if (data.state === State.Review) progress.review++
      else progress.learning++
      if (isDue(data, now)) progress.due++
    }
    return progress
  })
}

export interface TodaySummary {
  due: number
  /** New cards available today: limited by the daily quota and the cards left. */
  fresh: number
  answeredToday: number
}

export function todaySummary(
  state: StoredState,
  now: Date,
  cards: readonly Card[] = allCards,
): TodaySummary {
  let due = 0
  let unseen = 0
  for (const card of cards) {
    const data = state.srs[card.id]
    if (!data) unseen++
    else if (isDue(data, now)) due++
  }
  const today = localDay(now)
  const answeredToday = state.answers.filter((answer) => localDay(new Date(answer.at)) === today)
  return {
    due,
    fresh: Math.min(unseen, newCardsLeftToday(state, now)),
    answeredToday: answeredToday.length,
  }
}

export interface Streak {
  /** Consecutive days with at least one answer, ending today or yesterday. */
  days: number
  activeToday: boolean
}

/** A streak is not broken until a full day passes without any answer. */
export function streak(state: StoredState, now: Date): Streak {
  const activeDays = new Set(state.answers.map((answer) => localDay(new Date(answer.at))))
  const activeToday = activeDays.has(localDay(now))

  const cursor = new Date(now)
  if (!activeToday) cursor.setDate(cursor.getDate() - 1)
  let days = 0
  while (activeDays.has(localDay(cursor))) {
    days++
    cursor.setDate(cursor.getDate() - 1)
  }
  return { days, activeToday }
}

export interface SuccessRate {
  answered: number
  correct: number
}

export interface ChapterSuccess extends SuccessRate {
  chapter: Chapter
}

export interface LearningObjectiveSuccess extends SuccessRate {
  lo: string
  chapter: number
}

/** Answers whose card still exists, paired with that card. */
function answeredCards(state: StoredState, cards: readonly Card[]) {
  const byId = new Map(cards.map((card) => [card.id, card]))
  return state.answers.flatMap((answer) => {
    const card = byId.get(answer.cardId)
    return card ? [{ answer, card }] : []
  })
}

export function overallSuccess(state: StoredState, cards: readonly Card[] = allCards): SuccessRate {
  const answers = answeredCards(state, cards)
  return { answered: answers.length, correct: answers.filter((a) => a.answer.correct).length }
}

export function successByChapter(
  state: StoredState,
  chapters: readonly Chapter[] = allChapters,
  cards: readonly Card[] = allCards,
): ChapterSuccess[] {
  const rows = new Map(
    chapters.map((chapter) => [chapter.id, { chapter, answered: 0, correct: 0 }]),
  )
  for (const { answer, card } of answeredCards(state, cards)) {
    const row = rows.get(card.chapter)
    if (!row) continue
    row.answered++
    if (answer.correct) row.correct++
  }
  return [...rows.values()]
}

/** One row per learning objective that has at least one answer, in syllabus order. */
export function successByLearningObjective(
  state: StoredState,
  cards: readonly Card[] = allCards,
): LearningObjectiveSuccess[] {
  const rows = new Map<string, LearningObjectiveSuccess>()
  for (const { answer, card } of answeredCards(state, cards)) {
    const row = rows.get(card.lo) ?? { lo: card.lo, chapter: card.chapter, answered: 0, correct: 0 }
    row.answered++
    if (answer.correct) row.correct++
    rows.set(card.lo, row)
  }
  return [...rows.values()].sort((a, b) => a.lo.localeCompare(b.lo, 'en', { numeric: true }))
}

export const WEAK_LO_MIN_ANSWERS = 3

/** Objectives with enough answers to be meaningful, lowest success rate first. */
export function weakestLearningObjectives(
  rows: readonly LearningObjectiveSuccess[],
  limit = 5,
  minAnswers = WEAK_LO_MIN_ANSWERS,
): LearningObjectiveSuccess[] {
  return rows
    .filter((row) => row.answered >= minAnswers && row.correct < row.answered)
    .sort((a, b) => a.correct / a.answered - b.correct / b.answered || b.answered - a.answered)
    .slice(0, limit)
}

export interface DayActivity extends SuccessRate {
  /** Local day, YYYY-MM-DD. */
  day: string
  date: Date
}

/** Answers per local day over the last `days` days, oldest first, today included. */
export function dailyActivity(state: StoredState, now: Date, days = 30): DayActivity[] {
  const result: DayActivity[] = []
  const index = new Map<string, DayActivity>()
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const row = { day: localDay(date), date, answered: 0, correct: 0 }
    result.push(row)
    index.set(row.day, row)
  }
  for (const answer of state.answers) {
    const row = index.get(localDay(new Date(answer.at)))
    if (!row) continue
    row.answered++
    if (answer.correct) row.correct++
  }
  return result
}
