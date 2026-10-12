import { useState } from 'react'
import CardPlayer from '../components/cards/CardPlayer.tsx'
import { CARD_TYPE_LABELS } from '../components/cards/labels.ts'
import PageTitle from '../components/PageTitle.tsx'
import Button from '../components/ui/Button.tsx'
import { cards } from '../data/cards.ts'
import { CARD_TYPES, type CardType } from '../data/schema.ts'
import { useStore } from '../state/store.tsx'

// Temporary browser to try every card type; replaced by the real practice mode in step 7.
export default function Practice() {
  const [type, setType] = useState<CardType | 'all'>('all')
  const [index, setIndex] = useState(0)
  const { state, recordAnswer } = useStore()

  const list = type === 'all' ? cards : cards.filter((card) => card.type === type)
  const card = list[Math.min(index, list.length - 1)]

  function goNext() {
    setIndex((i) => Math.min(i + 1, list.length - 1))
  }

  return (
    <>
      <PageTitle
        title="Entraînement libre"
        subtitle="Parcours de toutes les cartes (version de test)."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Type
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as CardType | 'all')
              setIndex(0)
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">Tous</option>
            {CARD_TYPES.map((value) => (
              <option key={value} value={value}>
                {CARD_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
          {index + 1} / {list.length} · {state.answers.length} réponses enregistrées
        </span>
      </div>

      {card && (
        <CardPlayer
          key={card.id}
          card={card}
          onGraded={({ correct }) => {
            // Flashcards are recorded once self-assessed, see renderActions.
            if (correct !== null) recordAnswer({ cardId: card.id, correct, mode: 'practice' })
          }}
          renderActions={({ correct }) =>
            correct === null ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    recordAnswer({ cardId: card.id, correct: false, mode: 'practice' })
                    goNext()
                  }}
                >
                  À revoir
                </Button>
                <Button
                  onClick={() => {
                    recordAnswer({ cardId: card.id, correct: true, mode: 'practice' })
                    goNext()
                  }}
                >
                  Je savais
                </Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button onClick={goNext} disabled={index >= list.length - 1}>
                  Carte suivante →
                </Button>
              </div>
            )
          }
        />
      )}

      <div className="mt-4 flex justify-between">
        <Button variant="ghost" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          ← Précédente
        </Button>
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => i + 1)}
          disabled={index >= list.length - 1}
        >
          Passer →
        </Button>
      </div>
    </>
  )
}
