import type { Card } from '../../data/schema.ts'
import { CARD_TYPE_LABELS } from './labels.ts'

export default function CardHeader({ card }: { card: Card }) {
  return (
    <div data-cy="card-header" className="flex flex-wrap items-center gap-2 text-xs">
      <span
        data-cy="card-type"
        className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
      >
        {CARD_TYPE_LABELS[card.type]}
      </span>
      <span
        data-cy="card-lo"
        className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      >
        {card.lo} · {card.k}
      </span>
      <span className="text-slate-500 dark:text-slate-400">Chapitre {card.chapter}</span>
      <span data-cy="card-id" className="ml-auto font-mono text-slate-400 dark:text-slate-500">
        {card.id}
      </span>
    </div>
  )
}
