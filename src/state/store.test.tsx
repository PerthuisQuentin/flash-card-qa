// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../lib/storage.ts'
import { memoryStorage } from '../test/memoryStorage.ts'
import { StoreProvider, useStore } from './store.tsx'

afterEach(cleanup)

let store: ReturnType<typeof useStore>

function Probe() {
  const value = useStore()
  useEffect(() => {
    store = value
  })
  return <p>answers: {value.state.answers.length}</p>
}

function mount(storage: ReturnType<typeof memoryStorage>) {
  return render(
    <StoreProvider storage={storage}>
      <Probe />
    </StoreProvider>,
  )
}

describe('StoreProvider', () => {
  it('persists recorded answers and reloads them', () => {
    const storage = memoryStorage()
    mount(storage)

    // Loading alone must not write anything.
    expect(storage.data.has(STORAGE_KEY)).toBe(false)

    act(() => store.recordAnswer({ cardId: 'c1-001', correct: true, mode: 'practice' }))
    expect(screen.getByText('answers: 1')).toBeTruthy()
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).answers).toHaveLength(1)

    // Simulates a page reload.
    cleanup()
    mount(storage)
    expect(screen.getByText('answers: 1')).toBeTruthy()
  })

  it('reports failed writes so the user can be warned', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    mount(storage)
    expect(store.saveFailed).toBe(false)

    act(() => store.recordAnswer({ cardId: 'c1-001', correct: true, mode: 'practice' }))
    expect(store.saveFailed).toBe(true)
    expect(screen.getByText('answers: 1')).toBeTruthy()
    vi.restoreAllMocks()
  })

  it('throws a helpful error outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useStore must be used inside <StoreProvider>')
  })
})
