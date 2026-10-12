import { z } from 'zod'

export const K_LEVELS = ['K1', 'K2', 'K3'] as const
export const CARD_TYPES = ['flashcard', 'mcq', 'true_false', 'ordering'] as const

const baseCard = {
  id: z.string().regex(/^c\d+-\d{3}$/, 'id must match c<chapter>-<nnn>'),
  chapter: z.number().int().positive(),
  section: z.string().min(1),
  lo: z.string().regex(/^FL-\d+\.\d+\.\d+$/, 'lo must match FL-x.y.z'),
  k: z.enum(K_LEVELS),
  question: z.string().min(1),
  explanation: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)),
}

export const flashcardSchema = z.strictObject({
  ...baseCard,
  type: z.literal('flashcard'),
  answer: z.string().min(1),
})

export const mcqSchema = z.strictObject({
  ...baseCard,
  type: z.literal('mcq'),
  options: z.array(z.string().min(1)).min(2),
  correct: z.array(z.number().int().nonnegative()).min(1),
})

export const trueFalseSchema = z.strictObject({
  ...baseCard,
  type: z.literal('true_false'),
  answer: z.boolean(),
})

export const orderingSchema = z.strictObject({
  ...baseCard,
  type: z.literal('ordering'),
  // Stored in the correct order; shuffled at display time.
  items: z.array(z.string().min(1)).min(2),
})

export const cardSchema = z.discriminatedUnion('type', [
  flashcardSchema,
  mcqSchema,
  trueFalseSchema,
  orderingSchema,
])

export const chapterSchema = z.strictObject({
  id: z.number().int().positive(),
  title: z.string().min(1),
  examQuestions: z.number().int().nonnegative(),
})

export const cardsFileSchema = z.strictObject({
  chapters: z.array(chapterSchema).min(1),
  cards: z.array(cardSchema),
})

export type KLevel = (typeof K_LEVELS)[number]
export type CardType = (typeof CARD_TYPES)[number]
export type Flashcard = z.infer<typeof flashcardSchema>
export type McqCard = z.infer<typeof mcqSchema>
export type TrueFalseCard = z.infer<typeof trueFalseSchema>
export type OrderingCard = z.infer<typeof orderingSchema>
export type Card = z.infer<typeof cardSchema>
export type CardId = Card['id']
export type Chapter = z.infer<typeof chapterSchema>
export type CardsFile = z.infer<typeof cardsFileSchema>

/**
 * Cross-field checks that the schema alone cannot express.
 * Returns a list of human-readable errors (empty when valid).
 */
export function findDataErrors(data: CardsFile): string[] {
  const errors: string[] = []

  const chapterIds = new Set<number>()
  for (const chapter of data.chapters) {
    if (chapterIds.has(chapter.id)) errors.push(`Duplicate chapter id ${chapter.id}`)
    chapterIds.add(chapter.id)
  }

  const cardIds = new Set<string>()
  for (const card of data.cards) {
    if (cardIds.has(card.id)) errors.push(`Duplicate card id ${card.id}`)
    cardIds.add(card.id)

    if (!card.id.startsWith(`c${card.chapter}-`)) {
      errors.push(`${card.id}: id prefix does not match chapter ${card.chapter}`)
    }
    if (!chapterIds.has(card.chapter)) {
      errors.push(`${card.id}: unknown chapter ${card.chapter}`)
    }
    if (!card.lo.startsWith(`FL-${card.chapter}.`)) {
      errors.push(`${card.id}: lo ${card.lo} does not belong to chapter ${card.chapter}`)
    }

    if (card.type === 'mcq') {
      if (new Set(card.correct).size !== card.correct.length) {
        errors.push(`${card.id}: duplicate index in correct`)
      }
      for (const index of card.correct) {
        if (index >= card.options.length) {
          errors.push(`${card.id}: correct index ${index} out of range`)
        }
      }
      if (new Set(card.options).size !== card.options.length) {
        errors.push(`${card.id}: duplicate options`)
      }
    }

    if (card.type === 'ordering' && new Set(card.items).size !== card.items.length) {
      // Duplicate items would make the correct order ambiguous.
      errors.push(`${card.id}: duplicate items`)
    }
  }

  return errors
}
