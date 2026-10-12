import { useEffect, useRef } from 'react'

/** Keys are lowercase `KeyboardEvent.key` values, with "space" for " " (e.g. "1", "v", "enter", "arrowleft"). */
export type HotkeyBindings = Partial<Record<string, () => void>>

const TEXT_ENTRY = 'textarea, select, [contenteditable=""], [contenteditable="true"]'
const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file'])
/** Controls that already react to Enter / Space natively. */
const ACTIVATABLE =
  'button, a[href], summary, [role="button"], [role="radio"], [role="checkbox"], [role="link"], input[type="checkbox"], input[type="radio"]'

export function normalizeKey(key: string): string {
  return key === ' ' ? 'space' : key.toLowerCase()
}

/** Decides whether a global shortcut must stay out of the way of the focused element. */
export function shouldIgnore(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return true
  const target = event.target
  if (!(target instanceof Element)) return false
  // Areas with their own keyboard handling (e.g. drag and drop).
  if (target.closest('[data-hotkeys="off"]')) return true
  if (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)) return true
  if (target.closest(TEXT_ENTRY)) return true
  const key = normalizeKey(event.key)
  return (key === 'enter' || key === 'space') && target.closest(ACTIVATABLE) !== null
}

/** Registers global keyboard shortcuts while `enabled` (desktop convenience, no visual cost). */
export function useHotkeys(bindings: HotkeyBindings, enabled = true) {
  // Latest bindings without re-subscribing on every render.
  const latest = useRef(bindings)
  useEffect(() => {
    latest.current = bindings
  })

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || shouldIgnore(event)) return
      const action = latest.current[normalizeKey(event.key)]
      if (!action) return
      event.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
