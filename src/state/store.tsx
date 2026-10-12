import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  loadState,
  saveState,
  STORAGE_KEY,
  type KeyValueStorage,
  type StoredState,
} from '../lib/storage.ts'
import { addAnswer, type NewAnswer } from './actions.ts'

interface StoreValue {
  state: StoredState
  /** Generic escape hatch for transitions defined in actions.ts. */
  update: (updater: (state: StoredState) => StoredState) => void
  recordAnswer: (answer: NewAnswer) => void
}

const StoreContext = createContext<StoreValue | null>(null)

interface StoreProviderProps {
  children: ReactNode
  /** Injected in tests; defaults to window.localStorage. */
  storage?: KeyValueStorage
}

export function StoreProvider({ children, storage }: StoreProviderProps) {
  const [state, setState] = useState(() => loadState(storage))
  // Skips the write that would otherwise follow the initial load or an external sync.
  const skipNextSave = useRef(true)

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    saveState(state, storage)
  }, [state, storage])

  // Keep several open tabs in sync: another tab's write replaces our state.
  useEffect(() => {
    if (storage) return
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return
      skipNextSave.current = true
      setState(loadState())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [storage])

  const update = useCallback((updater: (state: StoredState) => StoredState) => {
    setState(updater)
  }, [])

  const recordAnswer = useCallback(
    (answer: NewAnswer) => setState((current) => addAnswer(current, answer)),
    [],
  )

  const value = useMemo(() => ({ state, update, recordAnswer }), [state, update, recordAnswer])
  return <StoreContext value={value}>{children}</StoreContext>
}

// oxlint-disable-next-line react/only-export-components -- hook colocated with its provider
export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside <StoreProvider>')
  return value
}
