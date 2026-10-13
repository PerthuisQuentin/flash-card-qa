// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { cards } from '../data/cards.ts'
import { STORAGE_KEY, type StoredState } from '../lib/storage.ts'
import { StoreProvider } from '../state/store.tsx'
import { memoryStorage } from '../test/memoryStorage.ts'
import { getOption } from '../test/options.ts'
import Practice from './Practice.tsx'

afterEach(cleanup)

function setup() {
  const storage = memoryStorage()
  render(
    <StoreProvider storage={storage}>
      <MemoryRouter>
        <Practice />
      </MemoryRouter>
    </StoreProvider>,
  )
  const stored = () => JSON.parse(storage.data.get(STORAGE_KEY)!) as StoredState
  return { user: userEvent.setup(), stored }
}

/** Answers the displayed card wrongly, whatever its type. Returns its id. */
async function answerWrong(user: UserEvent): Promise<string> {
  const question = screen.getByRole('heading', { level: 2 }).textContent
  const card = cards.find((c) => c.question === question)!

  if (card.type === 'flashcard') {
    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: 'Je ne savais pas' }))
    return card.id
  }
  if (card.type === 'mcq') {
    const wrong = card.options.findIndex((_, i) => !card.correct.includes(i))
    // When every option is correct, selecting a single one is still wrong.
    await user.click(getOption(card.options[wrong === -1 ? 0 : wrong]))
  }
  if (card.type === 'true_false') {
    await user.click(screen.getByRole('radio', { name: card.answer ? 'Faux' : 'Vrai' }))
  }
  // Ordering cards start shuffled, hence already wrong.
  await user.click(screen.getByRole('button', { name: 'Valider' }))
  await user.click(screen.getByRole('button', { name: /Carte suivante|Voir le bilan/ }))
  return card.id
}

describe('Practice page', () => {
  it('has no mistakes to practice on a fresh start', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /Uniquement mes erreurs/ }))
    expect(
      screen
        .getByRole('button', { name: 'Aucune erreur à retravailler 🎉' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('plays a series without touching the review schedule, then replays mistakes', async () => {
    const { user, stored } = setup()
    await user.click(screen.getByRole('radio', { name: '10' }))
    await user.click(screen.getByRole('button', { name: 'Commencer (10 cartes)' }))
    expect(screen.getByText('1 / 10')).toBeTruthy()

    const missed = await answerWrong(user)
    expect(screen.getByText('2 / 10')).toBeTruthy()
    expect(stored().answers).toMatchObject([{ cardId: missed, correct: false, mode: 'practice' }])
    expect(stored().srs).toEqual({})

    await user.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(screen.getByText('À retravailler (1)')).toBeTruthy()
    expect(screen.getByText('0 %')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Rejouer mes erreurs' }))
    expect(screen.getByText('1 / 1')).toBeTruthy()
    expect(cards.find((c) => c.id === missed)!.question).toBe(
      screen.getByRole('heading', { level: 2 }).textContent,
    )
  })

  it('offers mistakes-only series once a card was missed', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('radio', { name: '10' }))
    await user.click(screen.getByRole('button', { name: 'Commencer (10 cartes)' }))
    await answerWrong(user)
    await user.click(screen.getByRole('button', { name: 'Terminer' }))
    await user.click(screen.getByRole('button', { name: 'Nouvelle série' }))

    await user.click(screen.getByRole('checkbox', { name: /Uniquement mes erreurs/ }))
    expect(screen.getByRole('button', { name: 'Commencer (1 carte)' })).toBeTruthy()
  })
})

describe('Practice page targeting a learning objective', () => {
  it('preselects the objective from the URL and lets the user remove it', async () => {
    render(
      <StoreProvider storage={memoryStorage()}>
        <MemoryRouter initialEntries={['/practice?lo=FL-1.3.1']}>
          <Practice />
        </MemoryRouter>
      </StoreProvider>,
    )
    const user = userEvent.setup()
    const count = cards.filter((card) => card.lo === 'FL-1.3.1').length

    expect(screen.getByText('FL-1.3.1')).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: 'Toutes' }))
    expect(screen.getByRole('button', { name: `Commencer (${count} cartes)` })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Retirer' }))
    expect(screen.getByRole('button', { name: `Commencer (${cards.length} cartes)` })).toBeTruthy()
  })
})
