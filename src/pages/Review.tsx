import { useState } from 'react'
import { Link } from 'react-router'
import CardPlayer from '../components/cards/CardPlayer.tsx'
import CardFilterPanel from '../components/CardFilterPanel.tsx'
import PageTitle from '../components/PageTitle.tsx'
import Button from '../components/ui/Button.tsx'
import StatTile from '../components/ui/StatTile.tsx'
import { getCard, type CardFilter } from '../data/cards.ts'
import type { CardId } from '../data/schema.ts'
import { formatDueDate, percent } from '../lib/format.ts'
import {
  buildReviewQueue,
  formatInterval,
  GRADE_LABELS,
  GRADES,
  gradeFromOutcome,
  isCorrectGrade,
  nextDueDate,
  previewIntervals,
  Rating,
  shouldRequeue,
  type Grade,
} from '../lib/srs.ts'
import { useStore } from '../state/store.tsx'

type Phase = 'setup' | 'session' | 'done'

interface SessionStats {
  answered: number
  correct: number
}

export default function Review() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [filter, setFilter] = useState<CardFilter>({})
  const [queue, setQueue] = useState<CardId[]>([])
  const [initialSize, setInitialSize] = useState(0)
  // Incremented on every rating so a requeued card remounts with a fresh state.
  const [step, setStep] = useState(0)
  const [stats, setStats] = useState<SessionStats>({ answered: 0, correct: 0 })

  function start(ids: CardId[]) {
    setQueue(ids)
    setInitialSize(ids.length)
    setStats({ answered: 0, correct: 0 })
    setPhase('session')
  }

  return (
    <>
      <PageTitle
        title="Révision"
        subtitle="Répétition espacée : cartes dues et nouvelles cartes."
      />
      {phase === 'setup' && <Setup filter={filter} onFilterChange={setFilter} onStart={start} />}
      {phase === 'session' && (
        <Session
          queue={queue}
          initialSize={initialSize}
          step={step}
          onRated={(correct, requeue) => {
            setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (correct ? 1 : 0) }))
            setStep((n) => n + 1)
            const [current, ...rest] = queue
            const next = requeue ? [...rest, current] : rest
            setQueue(next)
            if (next.length === 0) setPhase('done')
          }}
          onStop={() => setPhase('done')}
        />
      )}
      {phase === 'done' && (
        <Summary stats={stats} filter={filter} onRestart={() => setPhase('setup')} />
      )}
    </>
  )
}

interface SetupProps {
  filter: CardFilter
  onFilterChange: (filter: CardFilter) => void
  onStart: (ids: CardId[]) => void
}

function Setup({ filter, onFilterChange, onStart }: SetupProps) {
  const { state } = useStore()
  const [now] = useState(() => new Date())
  const queue = buildReviewQueue(state, filter, now)
  const total = queue.due.length + queue.fresh.length
  const next = total === 0 ? nextDueDate(state, filter, now) : undefined

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <StatTile label="Cartes dues" value={queue.due.length} />
        <StatTile label="Nouvelles cartes" value={queue.fresh.length} />
      </section>

      <Button
        className="w-full"
        disabled={total === 0}
        onClick={() => onStart([...queue.due, ...queue.fresh])}
      >
        {total === 0 ? 'Rien à réviser' : `Commencer (${total} cartes)`}
      </Button>
      {total === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          {next
            ? `Prochaine carte due ${formatDueDate(next, now)}.`
            : 'Aucune carte pour ce filtre, ou quota de nouvelles cartes atteint pour aujourd’hui.'}
        </p>
      )}

      <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer font-medium">Filtrer les cartes</summary>
        <div className="mt-4">
          <CardFilterPanel value={filter} onChange={onFilterChange} />
        </div>
      </details>
    </div>
  )
}

interface SessionProps {
  queue: CardId[]
  initialSize: number
  step: number
  onRated: (correct: boolean, requeue: boolean) => void
  onStop: () => void
}

function Session({ queue, initialSize, step, onRated, onStop }: SessionProps) {
  const { state, reviewCard } = useStore()
  const card = getCard(queue[0])
  if (!card) return null

  const done = Math.max(0, initialSize - queue.length)
  const progress = initialSize > 0 ? Math.min(100, (done / initialSize) * 100) : 0

  function rate(grade: Grade, correct: boolean) {
    const data = reviewCard({ cardId: card!.id, grade, correct })
    // last_review is the time of this rating.
    onRated(correct, shouldRequeue(data, new Date(data.last_review!)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span>{queue.length} restante(s)</span>
        <Button variant="ghost" onClick={onStop}>
          Terminer
        </Button>
      </div>

      <CardPlayer
        key={`${card.id}-${step}`}
        card={card}
        renderActions={({ correct, answeredAt }) => {
          const preview = previewIntervals(state, card.id, answeredAt)
          const label = (grade: Grade) => formatInterval(answeredAt, preview[grade])

          if (correct === null) {
            return (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRADES.map((grade) => (
                  <RatingButton
                    key={grade}
                    grade={grade}
                    interval={label(grade)}
                    onClick={() => rate(grade, isCorrectGrade(grade))}
                  />
                ))}
              </div>
            )
          }
          if (!correct) {
            return (
              <div className="flex justify-end">
                <Button onClick={() => rate(Rating.Again, false)}>
                  Continuer · revient dans {label(Rating.Again)}
                </Button>
              </div>
            )
          }
          return (
            <div className="grid grid-cols-2 gap-2">
              <RatingButton
                grade={Rating.Good}
                interval={label(Rating.Good)}
                onClick={() => rate(gradeFromOutcome(true), true)}
              />
              <RatingButton
                grade={Rating.Easy}
                label="C'était facile"
                interval={label(Rating.Easy)}
                onClick={() => rate(gradeFromOutcome(true, true), true)}
              />
            </div>
          )
        }}
      />
    </div>
  )
}

const GRADE_STYLES: Record<Grade, string> = {
  [Rating.Again]:
    'border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40',
  [Rating.Hard]:
    'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40',
  [Rating.Good]:
    'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40',
  [Rating.Easy]:
    'border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40',
}

interface RatingButtonProps {
  grade: Grade
  interval: string
  label?: string
  onClick: () => void
}

function RatingButton({ grade, interval, label, onClick }: RatingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center rounded-lg border-2 bg-white px-3 py-2 font-medium transition-colors dark:bg-slate-900 ${GRADE_STYLES[grade]}`}
    >
      <span>{label ?? GRADE_LABELS[grade]}</span>
      <span className="text-xs opacity-75">{interval}</span>
    </button>
  )
}

interface SummaryProps {
  stats: SessionStats
  filter: CardFilter
  onRestart: () => void
}

function Summary({ stats, filter, onRestart }: SummaryProps) {
  const { state } = useStore()
  const [now] = useState(() => new Date())
  const next = nextDueDate(state, filter, now)
  const rate = percent(stats.correct, stats.answered)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Session terminée 🎉</h2>
      <section className="grid grid-cols-2 gap-3">
        <StatTile label="Réponses" value={stats.answered} />
        <StatTile label="Réussite" value={`${rate} %`} />
      </section>
      {next && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Prochaine carte due {formatDueDate(next, now)}.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={onRestart}>Nouvelle session</Button>
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
