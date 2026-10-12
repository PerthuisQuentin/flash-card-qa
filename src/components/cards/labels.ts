import type { CardType } from '../../data/schema.ts'

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  flashcard: 'Flash card',
  mcq: 'QCM',
  true_false: 'Vrai / Faux',
  ordering: 'Remise en ordre',
}

export const OPTION_LETTERS = 'ABCDEFGHIJ'
