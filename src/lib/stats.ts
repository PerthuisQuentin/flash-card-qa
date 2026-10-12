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
