import rawData from './cards.json'
import type { Card, CardId, CardsFile, Chapter, KLevel } from './schema.ts'

// The JSON is validated by src/data/cards.test.ts, so a cast is enough at runtime.
const data = rawData as CardsFile

export const chapters: readonly Chapter[] = data.chapters
export const cards: readonly Card[] = data.cards

const cardsById = new Map<CardId, Card>(cards.map((card) => [card.id, card]))

export function getCard(id: CardId): Card | undefined {
  return cardsById.get(id)
}

export function getChapter(id: number): Chapter | undefined {
  return chapters.find((chapter) => chapter.id === id)
}

export function cardsOfChapter(chapterId: number): Card[] {
  return cards.filter((card) => card.chapter === chapterId)
}

/** Every criterion is optional; an empty or missing list means "no restriction". */
export interface CardFilter {
  chapters?: number[]
  levels?: KLevel[]
  /** A card matches if it has at least one of these tags. */
  tags?: string[]
  los?: string[]
}

export function matchesFilter(card: Card, filter: CardFilter): boolean {
  const { chapters, levels, tags, los } = filter
  if (chapters?.length && !chapters.includes(card.chapter)) return false
  if (levels?.length && !levels.includes(card.k)) return false
  if (tags?.length && !card.tags.some((tag) => tags.includes(tag))) return false
  if (los?.length && !los.includes(card.lo)) return false
  return true
}

export function filterCards(filter: CardFilter, source: readonly Card[] = cards): Card[] {
  return source.filter((card) => matchesFilter(card, filter))
}

/** Sorted list of all tags used in the given cards. */
export function listTags(source: readonly Card[] = cards): string[] {
  return [...new Set(source.flatMap((card) => card.tags))].sort((a, b) => a.localeCompare(b, 'fr'))
}

/** Sorted list of all learning objectives used in the given cards. */
export function listLearningObjectives(source: readonly Card[] = cards): string[] {
  return [...new Set(source.map((card) => card.lo))].sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  )
}
