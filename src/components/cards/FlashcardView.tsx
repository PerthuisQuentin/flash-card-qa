import type { Flashcard } from '../../data/schema.ts'

interface FlashcardViewProps {
  card: Flashcard
  revealed: boolean
}

export default function FlashcardView({ card, revealed }: FlashcardViewProps) {
  if (!revealed) {
    return (
      <p data-cy="flashcard-hint" className="text-sm text-slate-500 italic dark:text-slate-400">
        Formule ta réponse, puis affiche-la pour t'auto-évaluer.
      </p>
    )
  }
  return (
    <div
      data-cy="flashcard-answer"
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 whitespace-pre-line dark:border-slate-700 dark:bg-slate-800/50"
    >
      {card.answer}
    </div>
  )
}
