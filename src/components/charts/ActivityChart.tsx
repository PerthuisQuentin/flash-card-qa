import { useState } from 'react'
import { niceCeil, percent } from '../../lib/format.ts'
import type { DayActivity } from '../../lib/stats.ts'

const dayLabel = (date: Date) =>
  date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const shortLabel = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

function describe(day: DayActivity): string {
  if (day.answered === 0) return `${dayLabel(day.date)} · aucune réponse`
  return `${dayLabel(day.date)} · ${day.answered} réponse${day.answered > 1 ? 's' : ''} · ${percent(day.correct, day.answered)} % de réussite`
}

/** Column chart of answers per day; hover or focus a column for its values. */
export default function ActivityChart({ days }: { days: DayActivity[] }) {
  const [active, setActive] = useState<number | null>(null)
  const total = days.reduce((sum, day) => sum + day.answered, 0)
  const max = niceCeil(Math.max(...days.map((day) => day.answered)))
  const middle = Math.floor((days.length - 1) / 2)

  return (
    <figure data-cy="activity-chart">
      <p
        data-cy="activity-chart-summary"
        aria-live="polite"
        className="mb-3 min-h-5 text-sm text-slate-600 dark:text-slate-300"
      >
        {active === null ? (
          <>
            <strong className="text-slate-900 dark:text-slate-100">{total}</strong> réponses sur{' '}
            {days.length} jours
          </>
        ) : (
          describe(days[active])
        )}
      </p>

      <div className="relative pl-7">
        <span className="absolute top-0 left-0 -translate-y-1/2 text-xs text-slate-400 tabular-nums">
          {max}
        </span>
        <span className="absolute bottom-0 left-0 translate-y-1/2 text-xs text-slate-400 tabular-nums">
          0
        </span>
        <div
          className="flex h-32 items-end gap-[2px] border-t border-b border-slate-200 dark:border-slate-800"
          onMouseLeave={() => setActive(null)}
        >
          {days.map((day, i) => (
            <div
              key={day.day}
              data-cy="activity-chart-day"
              tabIndex={0}
              role="img"
              aria-label={describe(day)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="flex h-full flex-1 items-end justify-center rounded-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              {day.answered > 0 && (
                <div
                  className={`w-full max-w-6 rounded-t bg-indigo-600 transition-opacity dark:bg-indigo-500 ${
                    active !== null && active !== i ? 'opacity-40' : ''
                  }`}
                  style={{ height: `${(day.answered / max) * 100}%` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between pl-7 text-xs text-slate-400">
        <span>{shortLabel(days[0].date)}</span>
        <span>{shortLabel(days[middle].date)}</span>
        <span>Aujourd’hui</span>
      </div>
    </figure>
  )
}
