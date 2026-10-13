import { useState } from 'react'
import { Link } from 'react-router'
import CardPlayer from '../components/cards/CardPlayer.tsx'
import CardFilterPanel from '../components/CardFilterPanel.tsx'
import PageTitle from '../components/PageTitle.tsx'
import Button from '../components/ui/Button.tsx'
import KeyHint from '../components/ui/KeyHint.tsx'
import StatTile from '../components/ui/StatTile.tsx'
import { getCard, type CardFilter } from '../data/cards.ts'
import type { CardId } from '../data/schema.ts'
import { useHotkeys } from '../hooks/useHotkeys.ts'
import { formatDueDate, percent } from '../lib/format.ts'
import {
  buildReviewQueue,
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
  // Cards rated at least once this session: drives progress, since requeued cards come back.
  const [seen, setSeen] = useState<ReadonlySet<CardId>>(new Set())
  // Incremented on every rating so a requeued card remounts with a fresh state.
  const [step, setStep] = useState(0)
  const [stats, setStats] = useState<SessionStats>({ answered: 0, correct: 0 })

  function start(ids: CardId[]) {
    setQueue(ids)
    setInitialSize(ids.length)
    setSeen(new Set())
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
          seen={seen}
          step={step}
          onRated={(correct, requeue) => {
            setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (correct ? 1 : 0) }))
            setStep((n) => n + 1)
            const [current, ...rest] = queue
            setSeen((ids) => new Set(ids).add(current))
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
  seen: ReadonlySet<CardId>
  step: number
  onRated: (correct: boolean, requeue: boolean) => void
  onStop: () => void
}

function Session({ queue, initialSize, seen, step, onRated, onStop }: SessionProps) {
  const { state, reviewCard } = useStore()
  const card = getCard(queue[0])
  if (!card) return null

  const progress = initialSize > 0 ? Math.min(100, (seen.size / initialSize) * 100) : 0
  const toRetry = queue.filter((id) => seen.has(id)).length

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
        <span>
          {`${seen.size} / ${initialSize} vues` + (toRetry > 0 ? ` · ${toRetry} à repasser` : '')}
        </span>
        <Button variant="ghost" onClick={onStop}>
          Terminer
        </Button>
      </div>

      <CardPlayer
        key={`${card.id}-${step}`}
        card={card}
        renderActions={({ correct, answeredAt }) => (
          <ReviewActions
            preview={previewIntervals(state, card.id, answeredAt)}
            correct={correct}
            onRate={rate}
          />
        )}
      />
    </div>
  )
}

interface ReviewActionsProps {
  /** Where each grade sends the card: "dans la session", "dans 2 j"… */
  preview: Record<Grade, string>
  correct: boolean | null
  onRate: (grade: Grade, correct: boolean) => void
}

/** Rating buttons shown once a card is answered, with matching keyboard shortcuts. */
function ReviewActions({ preview, correct, onRate }: ReviewActionsProps) {
  const good = () => onRate(gradeFromOutcome(true), true)
  const easy = () => onRate(gradeFromOutcome(true, true), true)
  const again = () => onRate(Rating.Again, false)

  useHotkeys(
    correct === null
      ? Object.fromEntries(
          GRADES.map((grade) => [String(grade), () => onRate(grade, isCorrectGrade(grade))]),
        )
      : correct
        ? { enter: good, space: good, '3': good, '4': easy }
        : { enter: again, space: again, '1': again },
  )

  if (correct === null) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Tu connaissais la réponse ?
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADES.map((grade) => (
            <RatingButton
              key={grade}
              grade={grade}
              interval={preview[grade]}
              onClick={() => onRate(grade, isCorrectGrade(grade))}
            />
          ))}
        </div>
        <KeyHint items={[['1–4', 'noter']]} />
      </div>
    )
  }
  if (!correct) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Revient {preview[Rating.Again]}
          </span>
          <Button onClick={again}>Continuer</Button>
        </div>
        <KeyHint items={[['Entrée', 'continuer']]} />
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <RatingButton
          grade={Rating.Good}
          label="Continuer"
          interval={preview[Rating.Good]}
          onClick={good}
        />
        <RatingButton grade={Rating.Easy} interval={preview[Rating.Easy]} onClick={easy} />
      </div>
      <KeyHint
        items={[
          ['Entrée', 'continuer'],
          ['4', 'trop facile'],
        ]}
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
