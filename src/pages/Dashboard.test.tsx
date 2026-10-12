// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { cardsOfChapter, chapters } from '../data/cards.ts'
import { applyReview, Rating } from '../lib/srs.ts'
import { createDefaultState, saveState, type StoredState } from '../lib/storage.ts'
import { StoreProvider } from '../state/store.tsx'
import { memoryStorage } from '../test/memoryStorage.ts'
import Dashboard from './Dashboard.tsx'

afterEach(cleanup)

function renderWith(state: StoredState) {
  const storage = memoryStorage()
  saveState(state, storage)
  render(
    <StoreProvider storage={storage}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </StoreProvider>,
  )
}

describe('Dashboard', () => {
  it('invites to review the new cards of the day on a fresh start', () => {
    renderWith(createDefaultState())
    expect(screen.getByRole('link', { name: 'Réviser (20)' })).toBeTruthy()
    expect(screen.getByText('🔥 0 j')).toBeTruthy()
    const upcoming = chapters.filter((chapter) => cardsOfChapter(chapter.id).length === 0)
    expect(screen.queryAllByText('Cartes à venir')).toHaveLength(upcoming.length)
  })

  it('reflects reviewed cards', () => {
    const state = applyReview(
      createDefaultState(),
      { cardId: 'c1-001', grade: Rating.Easy, correct: true },
      new Date(),
    )
    renderWith(state)

    // One new card already introduced today: 19 left in the quota.
    expect(screen.getByRole('link', { name: 'Réviser (19)' })).toBeTruthy()
    expect(screen.getByText('🔥 1 j')).toBeTruthy()
    expect(screen.getByText(/^1 \/ \d+$/)).toBeTruthy()
    expect(screen.getByLabelText(/^1 en révision, 0 en apprentissage/)).toBeTruthy()
  })
})
