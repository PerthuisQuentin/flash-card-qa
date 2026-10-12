import type { McqCard } from '../../data/schema.ts'
import { isMultiAnswer } from '../../lib/grading.ts'
import { OPTION_LETTERS } from './labels.ts'

interface McqViewProps {
  card: McqCard
  selected: number[]
  onChange: (selected: number[]) => void
  revealed: boolean
}

export default function McqView({ card, selected, onChange, revealed }: McqViewProps) {
  const multi = isMultiAnswer(card)

  function toggle(index: number) {
    if (!multi) return onChange([index])
    onChange(
      selected.includes(index)
        ? selected.filter((i) => i !== index)
        : [...selected, index].sort((a, b) => a - b),
    )
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        {multi ? `Sélectionne ${card.correct.length} réponses.` : 'Sélectionne une seule réponse.'}
      </legend>
      {card.options.map((option, index) => {
        const isSelected = selected.includes(index)
        const isCorrect = card.correct.includes(index)
        return (
          <label
            key={index}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:disabled]:cursor-default ${optionStyle(
              revealed,
              isSelected,
              isCorrect,
            )}`}
          >
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={`mcq-${card.id}`}
              className="mt-1 accent-indigo-600"
              checked={isSelected}
              disabled={revealed}
              onChange={() => toggle(index)}
            />
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {OPTION_LETTERS[index]}.
            </span>
            <span className="flex-1">{option}</span>
            {revealed && isCorrect && (
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                ✓ Bonne réponse
              </span>
            )}
            {revealed && isSelected && !isCorrect && (
              <span className="text-sm font-medium text-rose-700 dark:text-rose-400">✗</span>
            )}
          </label>
        )
      })}
    </fieldset>
  )
}

function optionStyle(revealed: boolean, isSelected: boolean, isCorrect: boolean): string {
  if (revealed) {
    if (isCorrect)
      return 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40'
    if (isSelected) return 'border-rose-500 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40'
    return 'border-slate-200 opacity-70 dark:border-slate-700'
  }
  return isSelected
    ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40'
    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
}
