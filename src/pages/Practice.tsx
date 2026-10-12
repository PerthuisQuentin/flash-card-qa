import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import CardPlayer from '../components/cards/CardPlayer.tsx'
import CardFilterPanel from '../components/CardFilterPanel.tsx'
import PageTitle from '../components/PageTitle.tsx'
import Button from '../components/ui/Button.tsx'
import KeyHint from '../components/ui/KeyHint.tsx'
import StatTile from '../components/ui/StatTile.tsx'
import { getCard, type CardFilter } from '../data/cards.ts'
import type { CardId } from '../data/schema.ts'
import { useHotkeys } from '../hooks/useHotkeys.ts'
import { shuffle } from '../lib/grading.ts'
import { percent } from '../lib/format.ts'
import {
  buildPracticeSet,
  practiceCandidates,
  PRACTICE_SIZES,
  type PracticeOptions,
  type PracticeSize,
} from '../lib/practice.ts'
import { useStore } from '../state/store.tsx'

type Phase = 'setup' | 'session' | 'done'

interface Result {
  cardId: CardId
  correct: boolean
}

export default function Practice() {
  const [phase, setPhase] = useState<Phase>('setup')
  // `?lo=FL-1.3.1` (from the stats page) targets a single learning objective.
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<CardFilter>(() => {
    const lo = searchParams.get('lo')
    return lo ? { los: [lo] } : {}
  })
  const [options, setOptions] = useState<PracticeOptions>({ size: 20, mistakesOnly: false })
  const [series, setSeries] = useState<CardId[]>([])
  const [results, setResults] = useState<Result[]>([])

  function start(ids: CardId[]) {
    setSeries(ids)
    setResults([])
    setPhase('session')
  }

  return (
    <>
      <PageTitle
        title="Entraînement libre"
        subtitle="Séries aléatoires, sans impact sur le planning de révision."
      />
      {phase === 'setup' && (
        <Setup
          filter={filter}
          options={options}
          onFilterChange={setFilter}
          onOptionsChange={setOptions}
          onStart={start}
        />
      )}
      {phase === 'session' && (
        <Session
          series={series}
          results={results}
          onAnswer={(result) => {
            const next = [...results, result]
            setResults(next)
            if (next.length === series.length) setPhase('done')
          }}
          onStop={() => setPhase('done')}
        />
      )}
      {phase === 'done' && (
        <Summary
          results={results}
          onRetryMistakes={(ids) => start(shuffle(ids))}
          onRestart={() => setPhase('setup')}
        />
      )}
    </>
  )
}

const SIZE_LABELS: Record<PracticeSize, string> = { 10: '10', 20: '20', 50: '50', all: 'Toutes' }

interface SetupProps {
  filter: CardFilter
  options: PracticeOptions
  onFilterChange: (filter: CardFilter) => void
  onOptionsChange: (options: PracticeOptions) => void
  onStart: (ids: CardId[]) => void
}

function Setup({ filter, options, onFilterChange, onOptionsChange, onStart }: SetupProps) {
  const { state } = useStore()
  const available = practiceCandidates(state, filter, options.mistakesOnly).length
  const count = options.size === 'all' ? available : Math.min(options.size, available)

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Taille de la série
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {PRACTICE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={options.size === size}
                onClick={() => onOptionsChange({ ...options, size })}
                className={`rounded-full border px-4 py-1 text-sm ${
                  options.size === size
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {SIZE_LABELS[size]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-indigo-600"
            checked={options.mistakesOnly}
            onChange={(event) =>
              onOptionsChange({ ...options, mistakesOnly: event.target.checked })
            }
          />
          Uniquement mes erreurs (cartes dont la dernière réponse était fausse)
        </label>

        {filter.los?.length ? (
          <p className="flex flex-wrap items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm dark:bg-indigo-950/40">
            Objectif ciblé : <strong className="font-mono">{filter.los.join(', ')}</strong>
            <button
              type="button"
              onClick={() => onFilterChange({ ...filter, los: [] })}
              className="ml-auto text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Retirer
            </button>
          </p>
        ) : null}

        <CardFilterPanel value={filter} onChange={onFilterChange} />
      </section>

      <Button
        className="w-full"
        disabled={count === 0}
        onClick={() => onStart(buildPracticeSet(state, filter, options))}
      >
        {count === 0
          ? options.mistakesOnly
            ? 'Aucune erreur à retravailler 🎉'
            : 'Aucune carte pour ce filtre'
          : `Commencer (${count} carte${count > 1 ? 's' : ''})`}
      </Button>
    </div>
  )
}

interface SessionProps {
  series: CardId[]
  results: Result[]
  onAnswer: (result: Result) => void
  onStop: () => void
}

function Session({ series, results, onAnswer, onStop }: SessionProps) {
  const { recordAnswer } = useStore()
  const index = results.length
  const card = getCard(series[index])
  if (!card) return null

  function answer(correct: boolean) {
    recordAnswer({ cardId: card!.id, correct, mode: 'practice' })
    onAnswer({ cardId: card!.id, correct })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${(index / series.length) * 100}%` }}
          />
        </div>
        <span>
          {index + 1} / {series.length}
        </span>
        <Button variant="ghost" onClick={onStop}>
          Terminer
        </Button>
      </div>

      <CardPlayer
        key={`${card.id}-${index}`}
        card={card}
        renderActions={({ correct }) => (
          <PracticeActions
            correct={correct}
            isLast={index + 1 === series.length}
            onAnswer={answer}
          />
        )}
      />
    </div>
  )
}

interface PracticeActionsProps {
  correct: boolean | null
  isLast: boolean
  onAnswer: (correct: boolean) => void
}

function PracticeActions({ correct, isLast, onAnswer }: PracticeActionsProps) {
  const next = () => onAnswer(correct === true)
  useHotkeys(
    correct === null
      ? { '1': () => onAnswer(false), '2': () => onAnswer(true) }
      : { enter: next, space: next },
  )

  if (correct === null) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => onAnswer(false)}>
            À revoir
          </Button>
          <Button onClick={() => onAnswer(true)}>Je savais</Button>
        </div>
        <KeyHint
          items={[
            ['1', 'à revoir'],
            ['2', 'je savais'],
          ]}
        />
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button onClick={next}>{isLast ? 'Voir le bilan' : 'Carte suivante →'}</Button>
      </div>
      <KeyHint items={[['Entrée', isLast ? 'bilan' : 'suivante']]} />
    </div>
  )
}

interface SummaryProps {
  results: Result[]
  onRetryMistakes: (ids: CardId[]) => void
  onRestart: () => void
}

function Summary({ results, onRetryMistakes, onRestart }: SummaryProps) {
  const correct = results.filter((result) => result.correct).length
  const mistakes = results.filter((result) => !result.correct).map((result) => result.cardId)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Série terminée</h2>
      <section className="grid grid-cols-2 gap-3">
        <StatTile label="Réponses" value={results.length} />
        <StatTile label="Réussite" value={`${percent(correct, results.length)} %`} />
      </section>

      {mistakes.length > 0 && (
        <section>
          <h3 className="mb-2 font-medium">À retravailler ({mistakes.length})</h3>
          <ul className="space-y-1 text-sm">
            {mistakes.map((id) => (
              <li
                key={id}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="mr-2 font-mono text-xs text-slate-400">{id}</span>
                {getCard(id)?.question}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {mistakes.length > 0 && (
          <Button onClick={() => onRetryMistakes(mistakes)}>Rejouer mes erreurs</Button>
        )}
        <Button variant={mistakes.length > 0 ? 'secondary' : 'primary'} onClick={onRestart}>
          Nouvelle série
        </Button>
        <Link
          to="/"
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
