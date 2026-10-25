import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { OrderingCard } from '../../data/schema.ts'
import { moveItem } from '../../lib/grading.ts'

interface OrderingViewProps {
  card: OrderingCard
  order: string[]
  onChange: (order: string[]) => void
  revealed: boolean
}

export default function OrderingView({ card, order, onChange, revealed }: OrderingViewProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // A short press delay keeps vertical scrolling usable on touch screens.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    onChange(moveItem(order, order.indexOf(String(active.id)), order.indexOf(String(over.id))))
  }

  if (revealed) {
    const allCorrect = order.every((item, i) => item === card.items[i])
    return (
      <div className="space-y-4">
        <ol data-cy="ordering-result" className="space-y-2">
          {order.map((item, i) => {
            const ok = item === card.items[i]
            return (
              <li
                key={item}
                data-cy="ordering-result-item"
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  ok
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40'
                    : 'border-rose-500 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40'
                }`}
              >
                <span className="font-semibold text-slate-500 dark:text-slate-400">{i + 1}.</span>
                <span className="flex-1">{item}</span>
                <span aria-label={ok ? 'Bien placé' : 'Mal placé'}>{ok ? '✓' : '✗'}</span>
              </li>
            )
          })}
        </ol>
        {!allCorrect && (
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Ordre attendu :
            </p>
            <ol data-cy="ordering-expected" className="list-decimal space-y-1 pl-6 text-sm">
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    )
  }

  return (
    // Drag and drop has its own keyboard handling (Space / Enter / arrows).
    <div data-hotkeys="off">
      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        Glisse les éléments (poignée ⋮⋮) ou utilise les flèches pour les remettre dans l'ordre.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol data-cy="ordering-list" className="space-y-2">
            {order.map((item, index) => (
              <SortableItem
                key={item}
                item={item}
                index={index}
                count={order.length}
                onMove={(to) => onChange(moveItem(order, index, to))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  )
}

interface SortableItemProps {
  item: string
  index: number
  count: number
  onMove: (to: number) => void
}

function SortableItem({ item, index, count, onMove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item })

  return (
    <li
      ref={setNodeRef}
      data-cy="ordering-item"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-white p-2 dark:bg-slate-900 ${
        isDragging
          ? 'relative z-10 border-indigo-500 shadow-lg'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        data-cy="ordering-handle"
        type="button"
        aria-label={`Déplacer « ${item} »`}
        className="cursor-grab touch-none rounded px-1.5 py-2 text-slate-400 hover:bg-slate-100 active:cursor-grabbing dark:hover:bg-slate-800"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <span className="w-5 font-semibold text-slate-500 dark:text-slate-400">{index + 1}.</span>
      <span className="flex-1">{item}</span>
      <div className="flex flex-col">
        <button
          type="button"
          data-cy="ordering-up"
          aria-label={`Monter « ${item} »`}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
          className="rounded px-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
        >
          ▲
        </button>
        <button
          type="button"
          data-cy="ordering-down"
          aria-label={`Descendre « ${item} »`}
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
          className="rounded px-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
        >
          ▼
        </button>
      </div>
    </li>
  )
}
