import { useState } from 'react'
import { Link } from 'react-router'
import PageTitle from '../components/PageTitle.tsx'
import StatTile from '../components/ui/StatTile.tsx'
import { formatDueDate, percent } from '../lib/format.ts'
import { nextDueDate } from '../lib/srs.ts'
import { chapterProgress, streak, todaySummary, type ChapterProgress } from '../lib/stats.ts'
import { useStore } from '../state/store.tsx'

export default function Dashboard() {
  const { state } = useStore()
  const [now] = useState(() => new Date())

  const today = todaySummary(state, now)
  const toReview = today.due + today.fresh
  const currentStreak = streak(state, now)
  const progress = chapterProgress(state, now)
  const next = toReview === 0 ? nextDueDate(state, {}, now) : undefined

  return (
    <>
      <PageTitle
        title="Tableau de bord"
        subtitle="ISTQB CTFL v4.0 — Testeur Certifié Niveau Fondation"
      />

      <section
        data-cy="dashboard-today"
        className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/40"
      >
        <h2 className="text-lg font-semibold">Aujourd’hui</h2>
        {toReview > 0 ? (
          <p data-cy="dashboard-today-summary" className="mt-1 text-slate-700 dark:text-slate-300">
            <strong>{today.due}</strong> carte{today.due > 1 ? 's' : ''} due
            {today.due > 1 ? 's' : ''} · <strong>{today.fresh}</strong> nouvelle
            {today.fresh > 1 ? 's' : ''}
          </p>
        ) : (
          <p data-cy="dashboard-today-summary" className="mt-1 text-slate-700 dark:text-slate-300">
            Tout est à jour 🎉
            {next && ` Prochaine carte due ${formatDueDate(next, now)}.`}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/review"
            data-cy="dashboard-review-cta"
            className={`inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium ${
              toReview > 0
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            {toReview > 0 ? `Réviser (${toReview})` : 'Ouvrir la révision'}
          </Link>
          <QuickLink to="/practice" cy="dashboard-practice-link">
            Entraînement libre
          </QuickLink>
          <QuickLink to="/exam" cy="dashboard-exam-link">
            Examen blanc
          </QuickLink>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          cy="dashboard-streak"
          label="Série en cours"
          value={`🔥 ${currentStreak.days} j`}
          hint={
            currentStreak.days > 0 && !currentStreak.activeToday
              ? 'Révise aujourd’hui pour la prolonger'
              : undefined
          }
        />
        <StatTile
          cy="dashboard-answered-today"
          label="Réponses aujourd’hui"
          value={today.answeredToday}
        />
        <StatTile
          cy="dashboard-cards-seen"
          label="Cartes vues"
          value={`${Object.keys(state.srs).length} / ${progress.reduce((n, p) => n + p.total, 0)}`}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Progression par chapitre</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {progress.map((p) => (
            <ChapterCard key={p.chapter.id} progress={p} />
          ))}
        </div>
        <Legend />
      </section>
    </>
  )
}

function ChapterCard({ progress }: { progress: ChapterProgress }) {
  const { chapter, total, fresh, learning, review, due } = progress
  const upcoming = total === 0

  return (
    <article
      data-cy={`dashboard-chapter-${chapter.id}`}
      className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${
        upcoming ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">
          <span className="text-slate-400">{chapter.id}.</span> {chapter.title}
        </h3>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          ~{chapter.examQuestions} Q
        </span>
      </div>

      {upcoming ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Cartes à venir</p>
      ) : (
        <>
          <div
            className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="img"
            aria-label={`${review} en révision, ${learning} en apprentissage, ${fresh} nouvelles sur ${total}`}
          >
            <div className="bg-emerald-500" style={{ width: `${(review / total) * 100}%` }} />
            <div className="bg-amber-400" style={{ width: `${(learning / total) * 100}%` }} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{percent(review + learning, total)} % vues</span>
            <span>{total} cartes</span>
            {due > 0 && (
              <span className="font-medium text-indigo-600 dark:text-indigo-400">{due} dues</span>
            )}
          </p>
        </>
      )}
    </article>
  )
}

function Legend() {
  return (
    <p className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-emerald-500" /> En révision
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-amber-400" /> En apprentissage
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Nouvelles
      </span>
    </p>
  )
}

function QuickLink({ to, cy, children }: { to: string; cy: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      data-cy={cy}
      className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </Link>
  )
}
