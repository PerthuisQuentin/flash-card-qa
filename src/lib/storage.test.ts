import { afterEach, describe, expect, it, vi } from 'vitest'
import { addAnswer } from '../state/actions.ts'
import { memoryStorage } from '../test/memoryStorage.ts'
import {
  createDefaultState,
  loadState,
  parseState,
  parseStateJson,
  saveState,
  STORAGE_KEY,
  type KeyValueStorage,
  type StoredState,
} from './storage.ts'

const sampleState = (): StoredState => ({
  ...createDefaultState(),
  srs: {
    'c1-001': {
      due: '2026-10-15T08:00:00.000Z',
      stability: 3.2,
      difficulty: 5.1,
      elapsed_days: 0,
      scheduled_days: 3,
      learning_steps: 0,
      reps: 1,
      lapses: 0,
      state: 2,
      last_review: '2026-10-12T08:00:00.000Z',
    },
  },
  answers: [
    { cardId: 'c1-001', at: '2026-10-12T08:00:00.000Z', correct: true, mode: 'review', rating: 3 },
  ],
  newCardsIntroduced: { '2026-10-12': 1 },
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadState', () => {
  it('returns the default state when nothing is stored', () => {
    expect(loadState(memoryStorage())).toEqual(createDefaultState())
  })

  it('returns the default state when storage is unavailable', () => {
    expect(loadState(undefined)).toEqual(createDefaultState())
  })

  it('round-trips a saved state', () => {
    const storage = memoryStorage()
    const state = sampleState()
    expect(saveState(state, storage)).toBe(true)
    expect(loadState(storage)).toEqual(state)
  })

  it('backs up corrupted data and starts fresh', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const storage = memoryStorage({ [STORAGE_KEY]: '{not json' })

    expect(loadState(storage)).toEqual(createDefaultState())
    const backups = [...storage.data.keys()].filter((key) => key.includes(':corrupt:'))
    expect(backups).toHaveLength(1)
    expect(storage.data.get(backups[0])).toBe('{not json')
  })

  it('rejects a state that does not match the schema', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const invalid = { ...sampleState(), settings: { newCardsPerDay: -3, desiredRetention: 0.9 } }
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(invalid) })
    expect(loadState(storage)).toEqual(createDefaultState())
  })

  it('survives a storage that throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadState(throwing)).toEqual(createDefaultState())
    expect(saveState(sampleState(), throwing)).toBe(false)
  })
})

describe('parseState', () => {
  it('accepts a valid state', () => {
    expect(parseState(sampleState())).toEqual({ ok: true, state: sampleState() })
  })

  it('rejects an unknown version', () => {
    const result = parseState({ ...sampleState(), version: 99 })
    expect(result.ok).toBe(false)
  })

  it('reports invalid JSON with a readable message', () => {
    expect(parseStateJson('nope')).toEqual({
      ok: false,
      error: 'Le fichier ne contient pas de JSON valide.',
    })
  })
})

describe('addAnswer', () => {
  it('appends a timestamped answer without mutating the state', () => {
    const state = createDefaultState()
    const next = addAnswer(
      state,
      { cardId: 'c1-002', correct: false, mode: 'practice' },
      new Date('2026-10-12T10:00:00Z'),
    )
    expect(state.answers).toEqual([])
    expect(next.answers).toEqual([
      { cardId: 'c1-002', correct: false, mode: 'practice', at: '2026-10-12T10:00:00.000Z' },
    ])
    expect(parseState(next).ok).toBe(true)
  })
})
