import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  /** `data-cy` of the tile; its parts are `stat-value`, `stat-label` and `stat-hint`. */
  cy?: string
}

export default function StatTile({ label, value, hint, cy }: StatTileProps) {
  return (
    <div
      data-cy={cy}
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div data-cy="stat-value" className="text-2xl font-bold tabular-nums">
        {value}
      </div>
      <div data-cy="stat-label" className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {hint && (
        <div data-cy="stat-hint" className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </div>
      )}
    </div>
  )
}
