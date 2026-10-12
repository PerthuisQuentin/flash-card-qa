import { useState } from 'react'
import { Link } from 'react-router'
import { isPassed, PASS_RATIO } from '../../lib/exam.ts'
import { percent } from '../../lib/format.ts'
import type { ExamResult } from '../../lib/storage.ts'

const GRIDLINES = [0, 50, 100]
const PASS_PERCENT = PASS_RATIO * 100

function describe(result: ExamResult): string {
  const total = result.questions.length
  const date = new Date(result.startedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
  return `${date} · ${result.score}/${total} · ${percent(result.score, total)} % · ${
    isPassed(result) ? 'réussi' : 'échoué'
  }`
}

/**
 * Exam score (%) over time with the 65 % pass mark. Lines are drawn in a
 * stretched SVG; dots and labels are HTML so they keep their size on any width.
 */
export default function ScoreTrendChart({ exams }: { exams: ExamResult[] }) {
  const [active, setActive] = useState<number | null>(null)
  const points = exams.map((result, i) => ({
    result,
    x: exams.length === 1 ? 50 : (i / (exams.length - 1)) * 100,
    y: percent(result.score, result.questions.length),
  }))
  const shown = active ?? points.length - 1

  return (
    <figure>
      <p aria-live="polite" className="mb-3 min-h-5 text-sm text-slate-600 dark:text-slate-300">
        {active === null && 'Dernier examen : '}
        {describe(points[shown].result)}
      </p>

      <div className="relative ml-11 h-44" onMouseLeave={() => setActive(null)}>
        {GRIDLINES.map((value) => (
          <div
            key={value}
            className="absolute inset-x-0 border-t border-slate-200 dark:border-slate-800"
            style={{ bottom: `${value}%` }}
          >
            <span className="absolute -left-11 w-9 -translate-y-1/2 text-right whitespace-nowrap text-xs text-slate-400 tabular-nums">
              {value} %
            </span>
          </div>
        ))}
        <div
          className="absolute inset-x-0 border-t border-slate-400 dark:border-slate-500"
          style={{ bottom: `${PASS_PERCENT}%` }}
        >
          <span className="absolute right-0 bottom-0.5 text-xs text-slate-500 dark:text-slate-400">
            Seuil {PASS_PERCENT} %
          </span>
        </div>

        {points.length > 1 && (
          <svg
            className="absolute inset-0 h-full w-full overflow-visible text-indigo-600 dark:text-indigo-500"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline
              points={points.map((p) => `${p.x},${100 - p.y}`).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {points.map((point, i) => (
          <Link
            key={point.result.id}
            to={`/exam/${point.result.id}`}
            aria-label={`Examen du ${describe(point.result)}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            // 24px hit area around a 10px dot.
            className="absolute flex size-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full outline-offset-1 focus-visible:outline-2 focus-visible:outline-indigo-500"
            style={{ left: `${point.x}%`, bottom: `${point.y}%` }}
          >
            <span
              className={`rounded-full bg-indigo-600 ring-2 ring-white transition-all dark:bg-indigo-500 dark:ring-slate-900 ${
                i === shown ? 'size-3' : 'size-2.5'
              }`}
            />
          </Link>
        ))}
      </div>

      <div className="mt-2 ml-11 flex justify-between text-xs text-slate-400">
        <span>{exams.length > 1 ? 'Premier examen' : ''}</span>
        <span>{exams.length > 1 ? 'Dernier' : ''}</span>
      </div>
    </figure>
  )
}
