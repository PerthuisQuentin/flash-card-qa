import { percent } from '../../lib/format.ts'
import { PASS_RATIO } from '../../lib/exam.ts'

interface SuccessBarProps {
  correct: number
  answered: number
}

/** Horizontal success-rate bar with a hairline at the 65 % pass mark. */
export default function SuccessBar({ correct, answered }: SuccessBarProps) {
  const value = percent(correct, answered)
  return (
    <div className="flex items-center gap-3">
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={`${value} % de réussite`}
        className="relative h-2.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-800"
      >
        {answered > 0 && (
          <div
            className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
            style={{ width: `${value}%` }}
          />
        )}
        <div
          className="absolute -inset-y-1 w-px bg-slate-400 dark:bg-slate-500"
          style={{ left: `${PASS_RATIO * 100}%` }}
          aria-hidden
        />
      </div>
      <span className="w-24 shrink-0 text-right text-sm tabular-nums">
        {answered > 0 ? (
          <>
            {value} % <span className="text-xs text-slate-400">({answered})</span>
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </span>
    </div>
  )
}
