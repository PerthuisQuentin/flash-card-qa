// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { cards } from '../data/cards.ts'
import { STORAGE_KEY, type StoredState } from '../lib/storage.ts'
import { StoreProvider } from '../state/store.tsx'
import { memoryStorage } from '../test/memoryStorage.ts'
import Review from './Review.tsx'

afterEach(cleanup)

function setup() {
  const storage = memoryStorage()
  render(
    <StoreProvider storage={storage}>
      <MemoryRouter>
        <Review />
      </MemoryRouter>
    </StoreProvider>,
  )
  const stored = () => JSON.parse(storage.data.get(STORAGE_KEY)!) as StoredState
  return { user: userEvent.setup(), stored }
}

describe('Review page', () => {
  it('runs a session: rates cards, requeues learning cards and shows a summary', async () => {
    const { user, stored } = setup()
    const [first] = cards
    expect(first.type).toBe('flashcard')

    // Default quota: 20 new cards, none due yet.
    await user.click(screen.getByRole('button', { name: 'Commencer (20 cartes)' }))
    expect(screen.getByText('0 / 20 vues')).toBeTruthy()
    expect(screen.getByText(first.question)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /^Je savais/ }))

    // Known at first sight: straight to review, it does not come back in the session.
    expect(screen.getByText('1 / 20 vues')).toBeTruthy()
    expect(stored().srs[first.id].state).toBe(2)
    expect(stored().answers).toMatchObject([
      { cardId: first.id, correct: true, mode: 'review', rating: 3 },
    ])
    expect(Object.values(stored().newCardsIntroduced)).toEqual([1])

    // Wrong answer on an auto-graded card is rated "Again".
    const second = cards[1]
    expect(second.type).toBe('true_false')
    if (second.type !== 'true_false') return
    await user.click(screen.getByRole('radio', { name: second.answer ? 'Faux' : 'Vrai' }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(screen.getByText('Revient dans la session')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(stored().answers[1]).toMatchObject({ cardId: second.id, correct: false, rating: 1 })
    // Missed: it goes back to the end of the queue.
    expect(screen.getByText('2 / 20 vues · 1 à repasser')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(screen.getByText('Session terminée 🎉')).toBeTruthy()
    expect(screen.getByText('50 %')).toBeTruthy()
  })

  it('can be driven entirely with the keyboard', async () => {
    const { user, stored } = setup()
    await user.click(screen.getByRole('button', { name: 'Commencer (20 cartes)' }))

    // Flashcard: Enter reveals, 3 rates "Good".
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /^Je savais/ })).toBeTruthy()
    await user.keyboard('3')
    expect(stored().answers[0]).toMatchObject({ cardId: cards[0].id, rating: 3 })

    // True/false: V or F answers, Enter validates, Enter continues.
    const second = cards[1]
    if (second.type !== 'true_false') throw new Error('Expected a true/false card')
    await user.keyboard(second.answer ? 'f' : 'v')
    await user.keyboard('{Enter}')
    expect(screen.getByText('✗ Mauvaise réponse')).toBeTruthy()
    await user.keyboard('{Enter}')
    expect(stored().answers[1]).toMatchObject({ cardId: second.id, correct: false, rating: 1 })
  })
})
