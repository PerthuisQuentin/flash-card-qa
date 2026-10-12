import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  loadState,
  saveState,
  STORAGE_KEY,
  type KeyValueStorage,
  type SrsCardData,
  type StoredState,
} from '../lib/storage.ts'
import { applyReview, type ReviewInput } from '../lib/srs.ts'
import { addAnswer, type NewAnswer } from './actions.ts'

interface StoreValue {
  state: StoredState
  /** Generic escape hatch for transitions defined in actions.ts. */
  update: (updater: (state: StoredState) => StoredState) => void
  recordAnswer: (answer: NewAnswer) => void
  /** True once a write to localStorage failed (private browsing, quota, blocked storage). */
  saveFailed: boolean
  /** Rates a card in review mode, updates its FSRS schedule and returns the new schedule. */
  reviewCard: (review: ReviewInput) => SrsCardData
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
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    const saved = saveState(state, storage)
    setSaveFailed((failed) => failed || !saved)
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

  // Latest state, so reviewCard can return the computed schedule synchronously.
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  const reviewCard = useCallback((review: ReviewInput) => {
    const next = applyReview(stateRef.current, review, new Date())
    stateRef.current = next
    setState(next)
    return next.srs[review.cardId]
  }, [])

  const value = useMemo(
    () => ({ state, saveFailed, update, recordAnswer, reviewCard }),
    [state, saveFailed, update, recordAnswer, reviewCard],
  )
  return <StoreContext value={value}>{children}</StoreContext>
}

// oxlint-disable-next-line react/only-export-components -- hook colocated with its provider
export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside <StoreProvider>')
  return value
}
