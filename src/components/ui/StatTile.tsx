import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
}

export default function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      {hint && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</div>}
    </div>
  )
}
