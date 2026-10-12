import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import ActivityChart from '../components/charts/ActivityChart.tsx'
import ScoreTrendChart from '../components/charts/ScoreTrendChart.tsx'
import SuccessBar from '../components/charts/SuccessBar.tsx'
import PageTitle from '../components/PageTitle.tsx'
import StatTile from '../components/ui/StatTile.tsx'
import { cards } from '../data/cards.ts'
import { isPassed } from '../lib/exam.ts'
import { percent } from '../lib/format.ts'
import {
  dailyActivity,
  overallSuccess,
  successByChapter,
  successByLearningObjective,
  type LearningObjectiveSuccess,
  WEAK_LO_MIN_ANSWERS,
  weakestLearningObjectives,
} from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

export default function Stats() {
  const { state } = useStore()
  const [now] = useState(() => new Date())

  const overall = overallSuccess(state)
  const byChapter = successByChapter(state)
  const byLo = successByLearningObjective(state)
  const weakest = weakestLearningObjectives(byLo)
  const passedExams = state.exams.filter(isPassed).length

  return (
    <>
      <PageTitle
        title="Statistiques"
        subtitle="Réussite en révision et en entraînement (hors examens blancs)."
      />

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Réponses" value={overall.answered} />
        <StatTile
          label="Réussite globale"
          value={overall.answered > 0 ? `${percent(overall.correct, overall.answered)} %` : '—'}
        />
        <StatTile
          label="Cartes vues"
          value={`${Object.keys(state.srs).length} / ${cards.length}`}
        />
        <StatTile
          label="Examens réussis"
          value={state.exams.length > 0 ? `${passedExams} / ${state.exams.length}` : '—'}
        />
      </section>

      <div className="space-y-6">
        <Panel title="Activité" subtitle="Réponses par jour, 30 derniers jours">
          <ActivityChart days={dailyActivity(state, now)} />
        </Panel>

        <Panel title="Réussite par chapitre" subtitle="Le trait vertical marque le seuil de 65 %">
          <ul className="space-y-3">
            {byChapter.map(({ chapter, answered, correct }) => (
              <li key={chapter.id}>
                <p className="mb-1 text-sm">
                  <span className="text-slate-400">{chapter.id}.</span> {chapter.title}
                </p>
                <SuccessBar answered={answered} correct={correct} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Objectifs à retravailler"
          subtitle={`Plus faibles taux de réussite (au moins ${WEAK_LO_MIN_ANSWERS} réponses)`}
        >
          {weakest.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pas encore assez de réponses, ou aucun point faible pour l’instant.
            </p>
          ) : (
            <ObjectiveList rows={weakest} />
          )}
        </Panel>

        <Panel title="Examens blancs" subtitle="Score de chaque examen, du premier au dernier">
          {state.exams.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucun examen passé.{' '}
              <Link to="/exam" className="text-indigo-600 underline dark:text-indigo-400">
                Lancer un examen blanc
              </Link>
            </p>
          ) : (
            <ScoreTrendChart exams={state.exams} />
          )}
        </Panel>

        <Panel
          title="Tous les objectifs"
          subtitle="Objectifs d’apprentissage ayant au moins une réponse"
        >
          {byLo.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucune réponse pour l’instant.
            </p>
          ) : (
            <ObjectiveList rows={byLo} />
          )}
        </Panel>
      </div>
    </>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      {children}
    </section>
  )
}

/** Stacks the bar under the objective id on narrow screens so it keeps a usable width. */
function ObjectiveList({ rows }: { rows: LearningObjectiveSuccess[] }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((row) => (
        <li key={row.lo} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
          <span className="w-20 font-mono text-sm">{row.lo}</span>
          <PracticeLink lo={row.lo} className="ml-auto sm:order-last" />
          <div className="w-full sm:w-auto sm:flex-1">
            <SuccessBar answered={row.answered} correct={row.correct} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function PracticeLink({ lo, className = '' }: { lo: string; className?: string }) {
  return (
    <Link
      to={`/practice?lo=${encodeURIComponent(lo)}`}
      className={`text-sm font-medium whitespace-nowrap text-indigo-600 hover:underline dark:text-indigo-400 ${className}`}
    >
      S’entraîner →
    </Link>
  )
}
