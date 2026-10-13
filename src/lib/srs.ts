import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
} from 'ts-fsrs'
import { filterCards, type CardFilter } from '../data/cards.ts'
import type { Card, CardId } from '../data/schema.ts'
import type { Settings, SrsCardData, StoredState } from './storage.ts'

export { Rating, State }
export type { Grade }

export const GRADES: readonly Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]

/** Worded as what the user felt, so they do not need to know how FSRS uses the grades. */
export const GRADE_LABELS: Record<Grade, string> = {
  [Rating.Again]: 'Je ne savais pas',
  [Rating.Hard]: 'J’ai hésité',
  [Rating.Good]: 'Je savais',
  [Rating.Easy]: 'Trop facile',
}

/**
 * A single 10-minute (re)learning step: a right answer takes a new card straight to
 * days, a wrong one brings it back once later in the session.
 */
const LEARNING_STEPS = ['10m'] as const

interface SchedulerOptions {
  /** Randomizes intervals slightly to spread reviews; disabled in tests for determinism. */
  fuzz?: boolean
}

export function createScheduler(settings: Settings, { fuzz = true }: SchedulerOptions = {}): FSRS {
  return fsrs({
    request_retention: settings.desiredRetention,
    enable_fuzz: fuzz,
    learning_steps: [...LEARNING_STEPS],
    relearning_steps: [...LEARNING_STEPS],
  })
}

export function serializeCard(card: FsrsCard): SrsCardData {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as SrsCardData['state'],
    ...(card.last_review && { last_review: card.last_review.toISOString() }),
  }
}

export function deserializeCard(data: SrsCardData): FsrsCard {
  return {
    ...data,
    due: new Date(data.due),
    state: data.state as State,
    last_review: data.last_review ? new Date(data.last_review) : undefined,
  }
}

/** Current FSRS card for an id, or a fresh one if it has never been reviewed. */
export function getFsrsCard(state: StoredState, cardId: CardId, now: Date): FsrsCard {
  const data = state.srs[cardId]
  return data ? deserializeCard(data) : createEmptyCard(now)
}

/** Local calendar day as YYYY-MM-DD (the user's day, not UTC). */
export function localDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function endOfLocalDay(date: Date): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Review cards (scheduled in days) are due for the whole day they fall on;
 * learning cards (scheduled in minutes) only once their time has come.
 */
export function isDue(data: SrsCardData, now: Date): boolean {
  const due = new Date(data.due)
  return data.state === State.Review ? due <= endOfLocalDay(now) : due <= now
}

export function newCardsLeftToday(state: StoredState, now: Date): number {
  const introduced = state.newCardsIntroduced[localDay(now)] ?? 0
  return Math.max(0, state.settings.newCardsPerDay - introduced)
}

export interface ReviewQueue {
  /** Already-seen cards to review, most overdue first. */
  due: CardId[]
  /** Never-seen cards within today's quota, in syllabus order. */
  fresh: CardId[]
}

export function buildReviewQueue(
  state: StoredState,
  filter: CardFilter,
  now: Date,
  source?: readonly Card[],
): ReviewQueue {
  const eligible = filterCards(filter, source)

  const due = eligible
    .filter((card) => state.srs[card.id] && isDue(state.srs[card.id], now))
    .sort((a, b) => state.srs[a.id].due.localeCompare(state.srs[b.id].due))
    .map((card) => card.id)

  const fresh = eligible
    .filter((card) => !state.srs[card.id])
    .slice(0, newCardsLeftToday(state, now))
    .map((card) => card.id)

  return { due, fresh }
}

/** Maps an auto-graded answer to an FSRS grade. */
export function gradeFromOutcome(correct: boolean, easy = false): Grade {
  if (!correct) return Rating.Again
  return easy ? Rating.Easy : Rating.Good
}

/** Self-assessed flashcards count as wrong only when rated "Again". */
export function isCorrectGrade(grade: Grade): boolean {
  return grade !== Rating.Again
}

export interface ReviewInput {
  cardId: CardId
  grade: Grade
  correct: boolean
}

/** Applies a review: updates the FSRS card, the daily new-card counter and the answer log. */
export function applyReview(
  state: StoredState,
  { cardId, grade, correct }: ReviewInput,
  now: Date,
  scheduler: FSRS = createScheduler(state.settings),
): StoredState {
  const isNew = !state.srs[cardId]
  const { card } = scheduler.next(getFsrsCard(state, cardId, now), now, grade)
  const day = localDay(now)

  return {
    ...state,
    srs: { ...state.srs, [cardId]: serializeCard(card) },
    newCardsIntroduced: isNew
      ? { ...state.newCardsIntroduced, [day]: (state.newCardsIntroduced[day] ?? 0) + 1 }
      : state.newCardsIntroduced,
    answers: [
      ...state.answers,
      { cardId, at: now.toISOString(), correct, mode: 'review', rating: grade },
    ],
  }
}

/** A card still in (re)learning and due again today comes back later in the same session. */
export function shouldRequeue(data: Pick<SrsCardData, 'state' | 'due'>, now: Date): boolean {
  return data.state !== State.Review && new Date(data.due) <= endOfLocalDay(now)
}

/**
 * What each grade would do, as shown under the rating buttons. A card that comes back
 * in the session reads as such, since the session does not wait for its minutes.
 */
export function previewIntervals(
  state: StoredState,
  cardId: CardId,
  now: Date,
  scheduler: FSRS = createScheduler(state.settings),
): Record<Grade, string> {
  const preview = scheduler.repeat(getFsrsCard(state, cardId, now), now)
  const describe = (grade: Grade) => {
    const { due, state: next } = preview[grade].card
    return shouldRequeue({ state: next as SrsCardData['state'], due: due.toISOString() }, now)
      ? 'dans la session'
      : `dans ${formatInterval(now, due)}`
  }
  return {
    [Rating.Again]: describe(Rating.Again),
    [Rating.Hard]: describe(Rating.Hard),
    [Rating.Good]: describe(Rating.Good),
    [Rating.Easy]: describe(Rating.Easy),
  }
}

/** Short French label for a delay: "1 min", "10 min", "3 h", "4 j", "2 mois", "1,5 an". */
export function formatInterval(from: Date, to: Date): string {
  const minutes = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  if (days < 31) return `${days} j`
  const months = days / 30.4
  if (months < 12) return `${Math.round(months)} mois`
  const years = Math.round((days / 365) * 10) / 10
  return `${String(years).replace('.', ',')} an${years >= 2 ? 's' : ''}`
}

/** Earliest upcoming due date among seen cards of the filter, if any. */
export function nextDueDate(
  state: StoredState,
  filter: CardFilter,
  now: Date,
  source?: readonly Card[],
): Date | undefined {
  let next: Date | undefined
  for (const card of filterCards(filter, source)) {
    const data = state.srs[card.id]
    if (!data) continue
    const due = new Date(data.due)
    if (due > now && (!next || due < next)) next = due
  }
  return next
}
