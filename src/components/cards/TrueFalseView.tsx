import type { TrueFalseCard } from '../../data/schema.ts'

interface TrueFalseViewProps {
  card: TrueFalseCard
  value: boolean | null
  onChange: (value: boolean) => void
  revealed: boolean
}

const CHOICES = [
  { value: true, label: 'Vrai' },
  { value: false, label: 'Faux' },
]

export default function TrueFalseView({ card, value, onChange, revealed }: TrueFalseViewProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Vrai ou faux">
      {CHOICES.map((choice) => {
        const isSelected = value === choice.value
        const isCorrect = card.answer === choice.value
        return (
          <button
            key={choice.label}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={revealed}
            onClick={() => onChange(choice.value)}
            className={`rounded-lg border-2 px-4 py-3 text-base font-semibold transition-colors disabled:cursor-default ${style(
              revealed,
              isSelected,
              isCorrect,
            )}`}
          >
            {choice.label}
            {revealed && isCorrect && ' ✓'}
            {revealed && isSelected && !isCorrect && ' ✗'}
          </button>
        )
      })}
    </div>
  )
}

function style(revealed: boolean, isSelected: boolean, isCorrect: boolean): string {
  if (revealed) {
    if (isCorrect)
      return 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
    if (isSelected)
      return 'border-rose-500 bg-rose-50 text-rose-800 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
    return 'border-slate-200 text-slate-400 dark:border-slate-700'
  }
  return isSelected
    ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
}
