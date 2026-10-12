import { Fragment } from 'react'

/** Keyboard shortcut reminder, only shown on devices with a precise pointer (mouse). */
export default function KeyHint({ items }: { items: [keys: string, label: string][] }) {
  return (
    <p className="hidden text-xs text-slate-400 pointer-fine:block dark:text-slate-500">
      Clavier :{' '}
      {items.map(([keys, label], i) => (
        <Fragment key={keys}>
          {i > 0 && ' · '}
          <kbd className="rounded border border-slate-300 px-1 font-sans dark:border-slate-700">
            {keys}
          </kbd>{' '}
          {label}
        </Fragment>
      ))}
    </p>
  )
}
