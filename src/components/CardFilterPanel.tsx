import { cardsOfChapter, chapters, listTags, type CardFilter } from '../data/cards.ts'
import { K_LEVELS } from '../data/schema.ts'

interface CardFilterPanelProps {
  value: CardFilter
  onChange: (filter: CardFilter) => void
}

const ALL_TAGS = listTags()

export default function CardFilterPanel({ value, onChange }: CardFilterPanelProps) {
  return (
    <div data-cy="card-filter" className="space-y-4">
      <FilterGroup label="Chapitres">
        {chapters.map((chapter) => {
          const available = cardsOfChapter(chapter.id).length > 0
          return (
            <Chip
              key={chapter.id}
              cy={`filter-chapter-${chapter.id}`}
              active={value.chapters?.includes(chapter.id) ?? false}
              disabled={!available}
              title={chapter.title}
              onClick={() => onChange({ ...value, chapters: toggle(value.chapters, chapter.id) })}
            >
              Ch. {chapter.id}
              {!available && ' (à venir)'}
            </Chip>
          )
        })}
      </FilterGroup>

      <FilterGroup label="Niveau">
        {K_LEVELS.map((level) => (
          <Chip
            key={level}
            cy={`filter-level-${level}`}
            active={value.levels?.includes(level) ?? false}
            onClick={() => onChange({ ...value, levels: toggle(value.levels, level) })}
          >
            {level}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Tags">
        {ALL_TAGS.map((tag) => (
          <Chip
            key={tag}
            cy="filter-tag"
            active={value.tags?.includes(tag) ?? false}
            onClick={() => onChange({ ...value, tags: toggle(value.tags, tag) })}
          >
            {tag}
          </Chip>
        ))}
      </FilterGroup>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Aucune sélection dans un groupe = tout est inclus.
      </p>
    </div>
  )
}

function toggle<T>(list: T[] | undefined, item: T): T[] {
  const current = list ?? []
  return current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

interface ChipProps {
  active: boolean
  disabled?: boolean
  title?: string
  cy: string
  onClick: () => void
  children: React.ReactNode
}

function Chip({ active, disabled, title, cy, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      data-cy={cy}
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}
