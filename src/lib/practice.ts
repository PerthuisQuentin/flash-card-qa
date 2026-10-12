import { filterCards, type CardFilter } from '../data/cards.ts'
import type { Card, CardId } from '../data/schema.ts'
import { shuffle, type Random } from './grading.ts'
import type { StoredState } from './storage.ts'

export const PRACTICE_SIZES = [10, 20, 50, 'all'] as const
export type PracticeSize = (typeof PRACTICE_SIZES)[number]

export interface PracticeOptions {
  size: PracticeSize
  /** Only cards whose most recent answer (any mode) was wrong. */
  mistakesOnly: boolean
}

/** Ids of the cards whose latest answer was wrong. */
export function mistakeCardIds(state: StoredState): Set<CardId> {
  const latest = new Map<CardId, boolean>()
  // Answers are appended chronologically, so the last one wins.
  for (const answer of state.answers) latest.set(answer.cardId, answer.correct)
  return new Set([...latest].filter(([, correct]) => !correct).map(([id]) => id))
}

export function practiceCandidates(
  state: StoredState,
  filter: CardFilter,
  mistakesOnly: boolean,
  source?: readonly Card[],
): Card[] {
  const eligible = filterCards(filter, source)
  if (!mistakesOnly) return eligible
  const mistakes = mistakeCardIds(state)
  return eligible.filter((card) => mistakes.has(card.id))
}

/** Random selection of card ids for a practice series. */
export function buildPracticeSet(
  state: StoredState,
  filter: CardFilter,
  { size, mistakesOnly }: PracticeOptions,
  random?: Random,
  source?: readonly Card[],
): CardId[] {
  const ids = practiceCandidates(state, filter, mistakesOnly, source).map((card) => card.id)
  const shuffled = shuffle(ids, random)
  return size === 'all' ? shuffled : shuffled.slice(0, size)
}
