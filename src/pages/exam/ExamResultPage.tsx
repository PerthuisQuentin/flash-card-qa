import { useState } from 'react'
import { Link, useParams } from 'react-router'
import McqView from '../../components/cards/McqView.tsx'
import PageTitle from '../../components/PageTitle.tsx'
import StatTile from '../../components/ui/StatTile.tsx'
import { getCard, getChapter } from '../../data/cards.ts'
import { breakdown, byChapter, byLevel, isPassed, type ScoreBreakdown } from '../../lib/exam.ts'
import { formatDateTime, formatDuration, percent } from '../../lib/format.ts'
import { useStore } from '../../state/store.tsx'
import { PassBadge } from './ExamHome.tsx'

export default function ExamResultPage() {
  const { id } = useParams()
  const { state } = useStore()
  const [mistakesOnly, setMistakesOnly] = useState(false)
  const result = state.exams.find((exam) => exam.id === id)

  if (!result) {
    return (
      <>
        <PageTitle title="Résultat introuvable" />
        <Link to="/exam" className="text-indigo-600 underline dark:text-indigo-400">
          Retour aux examens
        </Link>
      </>
    )
  }

  const total = result.questions.length
  const passed = isPassed(result)
  const questions = result.questions
    .map((question, index) => ({ ...question, index }))
    .filter((question) => !mistakesOnly || !question.correct)

  return (
    <>
      <PageTitle
        title="Résultat de l’examen blanc"
        subtitle={formatDateTime(new Date(result.startedAt))}
      />

      <section
        className={`mb-6 flex flex-wrap items-center gap-4 rounded-xl border p-5 ${
          passed
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
            : 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40'
        }`}
      >
        <div className="text-4xl font-bold tabular-nums">
          {result.score}/{total}
        </div>
        <div>
          <PassBadge passed={passed} />
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {percent(result.score, total)} % · seuil {result.passMark}/{total}
          </p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Temps passé"
          value={formatDuration(result.elapsedSec)}
          hint={`sur ${formatDuration(result.durationSec)}${result.timedOut ? ' · temps écoulé' : ''}`}
        />
        <StatTile label="Bonnes réponses" value={result.score} />
        <StatTile
          label="Sans réponse"
          value={result.questions.filter((q) => q.selected.length === 0).length}
        />
      </section>

      {result.warning && (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          ⚠️ {result.warning}
        </p>
      )}

      <section className="mb-8 grid gap-6 sm:grid-cols-2">
        <BreakdownTable
          title="Par chapitre"
          rows={breakdown(result, byChapter, getCard)}
          label={(key) => `${key}. ${getChapter(key)?.title ?? ''}`}
        />
        <BreakdownTable
          title="Par niveau"
          rows={breakdown(result, byLevel, getCard)}
          label={(key) => key}
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Correction</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-indigo-600"
              checked={mistakesOnly}
              onChange={(event) => setMistakesOnly(event.target.checked)}
            />
            Uniquement les erreurs
          </label>
        </div>
        <ol className="space-y-4">
          {questions.map((question) => {
            const card = getCard(question.cardId)
            if (card?.type !== 'mcq') return null
            return (
              <li
                key={question.cardId}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Question {question.index + 1}
                  </span>
                  <span
                    className={
                      question.correct
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }
                  >
                    {question.correct
                      ? '✓ Juste'
                      : question.selected.length === 0
                        ? '✗ Sans réponse'
                        : '✗ Faux'}
                  </span>
                  <span className="ml-auto text-xs text-slate-400">
                    {card.lo} · {card.k} · {card.id}
                  </span>
                </div>
                <h3 className="font-semibold">{card.question}</h3>
                <McqView card={card} selected={question.selected} onChange={() => {}} revealed />
                {card.explanation && (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <span className="font-semibold">Explication : </span>
                    {card.explanation}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
        {questions.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune erreur 🎉</p>
        )}
      </section>

      <Link
        to="/exam"
        className="mt-8 inline-flex rounded-lg px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800"
      >
        ← Retour aux examens
      </Link>
    </>
  )
}

interface BreakdownTableProps<K> {
  title: string
  rows: ScoreBreakdown<K>[]
  label: (key: K) => string
}

function BreakdownTable<K extends number | string>({ title, rows, label }: BreakdownTableProps<K>) {
  return (
    <div>
      <h2 className="mb-2 font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => {
            const pct = percent(row.correct, row.total)
            return (
              <tr key={String(row.key)} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-2">{label(row.key)}</td>
                <td className="w-24 py-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={pct >= 65 ? 'h-full bg-emerald-500' : 'h-full bg-rose-500'}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
                <td className="py-1.5 pl-2 text-right whitespace-nowrap tabular-nums">
                  {row.correct}/{row.total}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
