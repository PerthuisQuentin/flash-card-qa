import type { Answer, Settings, StoredState } from '../lib/storage.ts'

export type NewAnswer = Omit<Answer, 'at'>

/** Pure state transitions; the store wires them to React and persistence. */
export function addAnswer(
  state: StoredState,
  answer: NewAnswer,
  now: Date = new Date(),
): StoredState {
  return { ...state, answers: [...state.answers, { ...answer, at: now.toISOString() }] }
}

export function updateSettings(state: StoredState, changes: Partial<Settings>): StoredState {
  return { ...state, settings: { ...state.settings, ...changes } }
}
