// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createDefaultState,
  saveState,
  serializeState,
  STORAGE_KEY,
  type StoredState,
} from '../lib/storage.ts'
import { addAnswer } from '../state/actions.ts'
import { StoreProvider } from '../state/store.tsx'
import { memoryStorage } from '../test/memoryStorage.ts'
import Settings from './Settings.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const withAnswers = (count: number): StoredState => {
  let state = createDefaultState()
  for (let i = 0; i < count; i++) {
    state = addAnswer(state, { cardId: 'c1-001', correct: true, mode: 'practice' })
  }
  return state
}

function setup(initial: StoredState = createDefaultState()) {
  const storage = memoryStorage()
  saveState(initial, storage)
  render(
    <StoreProvider storage={storage}>
      <Settings />
    </StoreProvider>,
  )
  const stored = () => JSON.parse(storage.data.get(STORAGE_KEY)!) as StoredState
  return { user: userEvent.setup(), stored }
}

const jsonFile = (content: string, name = 'backup.json') =>
  new File([content], name, { type: 'application/json' })

describe('Settings page', () => {
  it('updates the daily new-card quota and ignores invalid values', async () => {
    const { user, stored } = setup()
    const input = () =>
      screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Nouvelles cartes par jour' })

    await user.clear(input())
    await user.type(input(), '35')
    expect(stored().settings.newCardsPerDay).toBe(20) // not saved while typing
    await user.tab()
    expect(stored().settings.newCardsPerDay).toBe(35)

    await user.clear(input())
    await user.type(input(), '9999')
    expect(screen.getByText('Entre un nombre entier entre 0 et 500.')).toBeTruthy()
    await user.type(input(), '{Enter}')
    expect(stored().settings.newCardsPerDay).toBe(35)
    expect(input().value).toBe('35')
  })

  it('updates the desired retention', async () => {
    const { user, stored } = setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rétention cible' }), '0.85')
    expect(stored().settings.desiredRetention).toBe(0.85)
  })

  it('exports the progression as a JSON download', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:backup')
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { user } = setup(withAnswers(2))

    await user.click(screen.getByRole('button', { name: 'Exporter la progression' }))

    expect(click).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0]
    expect(JSON.parse(await blob.text()).answers).toHaveLength(2)
  })

  it('imports a valid backup after confirmation', async () => {
    const { user, stored } = setup(withAnswers(1))

    await user.upload(screen.getByTestId('import-input'), jsonFile(serializeState(withAnswers(3))))
    expect(screen.getByText(/0 carte vue, 3 réponses/)).toBeTruthy()
    expect(stored().answers).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Remplacer' }))
    expect(stored().answers).toHaveLength(3)
    expect(screen.getByText('✓ Progression importée.')).toBeTruthy()
  })

  it('rejects an invalid backup without touching the progression', async () => {
    const { user, stored } = setup(withAnswers(1))

    await user.upload(screen.getByTestId('import-input'), jsonFile('{"version": 42}'))
    expect(screen.getByText('Fichier invalide, rien n’a été modifié.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Remplacer' })).toBeNull()
    expect(stored().answers).toHaveLength(1)
  })

  it('resets the progression only after a second confirmation', async () => {
    const { user, stored } = setup(withAnswers(2))

    await user.click(screen.getByRole('button', { name: 'Réinitialiser la progression…' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(stored().answers).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Réinitialiser la progression…' }))
    await user.click(screen.getByRole('button', { name: 'Oui, tout effacer' }))
    expect(stored()).toEqual(createDefaultState())
  })

  it('refreshes the settings form after an import', async () => {
    const { user } = setup()
    const imported = createDefaultState()
    imported.settings.newCardsPerDay = 42

    await user.upload(screen.getByTestId('import-input'), jsonFile(serializeState(imported)))
    await user.click(screen.getByRole('button', { name: 'Remplacer' }))
    const input = screen.getByRole('spinbutton', { name: 'Nouvelles cartes par jour' })
    expect((input as HTMLInputElement).value).toBe('42')
  })
})
