import { Link } from 'react-router'
import PageTitle from '../../components/PageTitle.tsx'
import Button from '../../components/ui/Button.tsx'
import { chapters } from '../../data/cards.ts'
import { createExam, isPassed, planExam, startExam } from '../../lib/exam.ts'
import { formatDateTime, formatDuration, percent } from '../../lib/format.ts'
import { useStore } from '../../state/store.tsx'

const plan = planExam()

export default function ExamHome() {
  const { state, update } = useStore()
  const history = [...state.exams].reverse()

  return (
    <>
      <PageTitle
        title="Examen blanc"
        subtitle="Conditions de l’examen CTFL : QCM uniquement, chronométré."
      />

      <section
        data-cy="exam-plan"
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <p className="text-lg">
          <strong>{plan.total} questions</strong> · {formatDuration(plan.durationSec)} · réussite à{' '}
          <strong>
            {plan.passMark}/{plan.total}
          </strong>{' '}
          (65 %)
        </p>

        {plan.warning && (
          <p
            role="note"
            data-cy="exam-warning"
            className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            ⚠️ {plan.warning}
          </p>
        )}

        <table data-cy="exam-quotas" className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="py-1 font-medium">Chapitre</th>
              <th className="py-1 text-right font-medium">Questions</th>
              <th className="py-1 text-right font-medium">Officiel</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter) => (
              <tr
                key={chapter.id}
                data-cy={`exam-quota-${chapter.id}`}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="py-1.5">
                  <span className="text-slate-400">{chapter.id}.</span> {chapter.title}
                </td>
                <td className="py-1.5 text-right tabular-nums">{plan.quotas[chapter.id]}</td>
                <td className="py-1.5 text-right text-slate-400 tabular-nums">
                  {chapter.examQuestions}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Button
          data-cy="exam-start"
          className="w-full"
          disabled={plan.total === 0}
          onClick={() => update((s) => startExam(s, createExam(new Date())))}
        >
          {plan.total === 0 ? 'Aucun QCM disponible' : 'Démarrer l’examen'}
        </Button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Le chrono démarre immédiatement et continue même si tu fermes la page. L’examen n’a aucun
          effet sur ton planning de révision.
        </p>
      </section>

      <section data-cy="exam-history" className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Historique</h2>
        {history.length === 0 ? (
          <p data-cy="exam-history-empty" className="text-sm text-slate-500 dark:text-slate-400">
            Aucun examen passé pour l’instant.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((result) => {
              const passed = isPassed(result)
              const total = result.questions.length
              return (
                <li key={result.id}>
                  <Link
                    to={`/exam/${result.id}`}
                    data-cy="exam-history-item"
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                  >
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDateTime(new Date(result.startedAt))}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {result.score}/{total} · {percent(result.score, total)} %
                    </span>
                    <PassBadge passed={passed} />
                    <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
                      {formatDuration(result.elapsedSec)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}

export function PassBadge({ passed }: { passed: boolean }) {
  return (
    <span
      data-cy="exam-pass-badge"
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        passed
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
      }`}
    >
      {passed ? 'Réussi' : 'Échoué'}
    </span>
  )
}
