import type { McqCard, OrderingCard, TrueFalseCard } from '../data/schema.ts'

export type Random = () => number

/** An MCQ is correct only if the selection is exactly the set of correct options. */
export function gradeMcq(card: McqCard, selected: readonly number[]): boolean {
  const unique = new Set(selected)
  return unique.size === card.correct.length && card.correct.every((index) => unique.has(index))
}

export function gradeTrueFalse(card: TrueFalseCard, value: boolean | null): boolean {
  return value === card.answer
}

/** `order` holds the items as arranged by the user; `card.items` is the correct order. */
export function gradeOrdering(card: OrderingCard, order: readonly string[]): boolean {
  return order.length === card.items.length && order.every((item, i) => item === card.items[i])
}

export function isMultiAnswer(card: McqCard): boolean {
  return card.correct.length > 1
}

/** Fisher–Yates shuffle, returns a new array. */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Shuffles the items of an ordering card, guaranteeing the result is not already correct. */
export function shuffleOrdering(items: readonly string[], random: Random = Math.random): string[] {
  const result = shuffle(items, random)
  if (result.length >= 2 && result.every((item, i) => item === items[i])) {
    ;[result[0], result[1]] = [result[1], result[0]]
  }
  return result
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items]
  if (from < 0 || from >= result.length || to < 0 || to >= result.length) return result
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}
