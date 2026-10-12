import { useState, type ReactNode } from 'react'
import type { Card } from '../../data/schema.ts'
import { useHotkeys, type HotkeyBindings } from '../../hooks/useHotkeys.ts'
import {
  gradeMcq,
  gradeOrdering,
  gradeTrueFalse,
  shuffleOptions,
  shuffleOrdering,
  toggleMcqOption,
} from '../../lib/grading.ts'
import Button from '../ui/Button.tsx'
import KeyHint from '../ui/KeyHint.tsx'
import CardHeader from './CardHeader.tsx'
import FlashcardView from './FlashcardView.tsx'
import McqView from './McqView.tsx'
import OrderingView from './OrderingView.tsx'
import TrueFalseView from './TrueFalseView.tsx'

export interface CardOutcome {
  /** null for flashcards, which are self-assessed. */
  correct: boolean | null
  answeredAt: Date
}

interface CardPlayerProps {
  card: Card
  onGraded?: (outcome: CardOutcome) => void
  /** Rendered below the feedback once the card is answered (next button, ratings…). */
  renderActions?: (outcome: CardOutcome) => ReactNode
}

/**
 * Plays a single card: collects the answer, grades it and shows the feedback.
 * Holds per-card state, so give it `key={card.id}` to reset it between cards.
 */
export default function CardPlayer({ card, onGraded, renderActions }: CardPlayerProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [trueFalse, setTrueFalse] = useState<boolean | null>(null)
  const [order, setOrder] = useState<string[]>(() =>
    card.type === 'ordering' ? shuffleOrdering(card.items) : [],
  )
  const [mcqOrder] = useState<number[]>(() => (card.type === 'mcq' ? shuffleOptions(card) : []))
  const [outcome, setOutcome] = useState<CardOutcome | null>(null)
  const revealed = outcome !== null

  const canSubmit =
    card.type === 'mcq'
      ? selected.length > 0
      : card.type === 'true_false'
        ? trueFalse !== null
        : true

  function submit() {
    const correct =
      card.type === 'mcq'
        ? gradeMcq(card, selected)
        : card.type === 'true_false'
          ? gradeTrueFalse(card, trueFalse)
          : card.type === 'ordering'
            ? gradeOrdering(card, order)
            : null
    const result = { correct, answeredAt: currentTime() }
    setOutcome(result)
    onGraded?.(result)
  }

  const bindings: HotkeyBindings = {}
  if (canSubmit) bindings.enter = bindings.space = submit
  if (card.type === 'mcq') {
    mcqOrder.forEach((index, position) => {
      bindings[String(position + 1)] = () => setSelected((s) => toggleMcqOption(card, s, index))
    })
  }
  if (card.type === 'true_false') {
    bindings.v = () => setTrueFalse(true)
    bindings.f = () => setTrueFalse(false)
  }
  useHotkeys(bindings, !revealed)

  return (
    <article className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <CardHeader card={card} />
      <h2 className="text-lg leading-snug font-semibold whitespace-pre-wrap">{card.question}</h2>

      {card.type === 'flashcard' && <FlashcardView card={card} revealed={revealed} />}
      {card.type === 'mcq' && (
        <McqView
          card={card}
          selected={selected}
          onChange={setSelected}
          revealed={revealed}
          order={mcqOrder}
        />
      )}
      {card.type === 'true_false' && (
        <TrueFalseView card={card} value={trueFalse} onChange={setTrueFalse} revealed={revealed} />
      )}
      {card.type === 'ordering' && (
        <OrderingView card={card} order={order} onChange={setOrder} revealed={revealed} />
      )}

      {!revealed && (
        <div className="space-y-2">
          <Button onClick={submit} disabled={!canSubmit} className="w-full sm:w-auto">
            {card.type === 'flashcard' ? 'Afficher la réponse' : 'Valider'}
          </Button>
          <KeyHint items={hintsFor(card)} />
        </div>
      )}

      {outcome && (
        <>
          <Feedback card={card} outcome={outcome} />
          {renderActions?.(outcome)}
        </>
      )}
    </article>
  )
}

/** Only called from event handlers (click or shortcut), never during render. */
function currentTime(): Date {
  return new Date()
}

function hintsFor(card: Card): [string, string][] {
  const submit: [string, string] = ['Entrée', card.type === 'flashcard' ? 'afficher' : 'valider']
  if (card.type === 'mcq') return [[`1–${card.options.length}`, 'choisir'], submit]
  if (card.type === 'true_false') return [['V', 'vrai'], ['F', 'faux'], submit]
  return [submit]
}

function Feedback({ card, outcome }: { card: Card; outcome: CardOutcome }) {
  if (outcome.correct === null && !card.explanation) return null
  return (
    <div className="space-y-2" aria-live="polite">
      {outcome.correct !== null && (
        <p
          className={`font-semibold ${
            outcome.correct
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
          }`}
        >
          {outcome.correct ? '✓ Bonne réponse !' : '✗ Mauvaise réponse'}
        </p>
      )}
      {card.explanation && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span className="font-semibold">Explication : </span>
          {card.explanation}
        </p>
      )}
    </div>
  )
}
