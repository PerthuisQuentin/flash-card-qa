// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { cards } from '../data/cards.ts'
import { createDefaultState, saveState, type ExamResult, type StoredState } from '../lib/storage.ts'
import { addAnswer } from '../state/actions.ts'
import { StoreProvider } from '../state/store.tsx'
import { memoryStorage } from '../test/memoryStorage.ts'
import Stats from './Stats.tsx'

afterEach(cleanup)

function renderWith(state: StoredState) {
  const storage = memoryStorage()
  saveState(state, storage)
  render(
    <StoreProvider storage={storage}>
      <MemoryRouter>
        <Stats />
      </MemoryRouter>
    </StoreProvider>,
  )
}

function exam(id: string, score: number, day: number): ExamResult {
  return {
    id,
    startedAt: new Date(2026, 9, day, 10).toISOString(),
    finishedAt: new Date(2026, 9, day, 10, 45).toISOString(),
    durationSec: 3600,
    elapsedSec: 2700,
    timedOut: false,
    passMark: 26,
    score,
    questions: cards
      .filter((card) => card.type === 'mcq')
      .slice(0, 40)
      .map((card, i) => ({ cardId: card.id, selected: [0], correct: i < score })),
  }
}

describe('Stats page', () => {
  it('shows empty states without data', () => {
    renderWith(createDefaultState())
    const readout = (_: string, el: Element | null) =>
      el?.tagName === 'P' && el.textContent === '0 réponses sur 30 jours'
    expect(screen.getByText(readout)).toBeTruthy()
    expect(screen.getByText(/Pas encore assez de réponses/)).toBeTruthy()
    expect(screen.getByText(/Aucun examen passé/)).toBeTruthy()
  })

  it('summarizes answers, weak objectives and exam scores', async () => {
    const principles = cards.filter((card) => card.lo === 'FL-1.3.1').slice(0, 4)
    const objectives = cards.filter((card) => card.lo === 'FL-1.1.1').slice(0, 2)
    let state = createDefaultState()
    // FL-1.3.1: 1/4 correct (weak). FL-1.1.1: 2/2 correct.
    principles.forEach((card, i) => {
      state = addAnswer(state, { cardId: card.id, correct: i === 0, mode: 'practice' })
    })
    objectives.forEach((card) => {
      state = addAnswer(state, { cardId: card.id, correct: true, mode: 'practice' })
    })
    state = { ...state, exams: [exam('e1', 20, 1), exam('e2', 30, 8)] }
    renderWith(state)

    const tile = (label: string) => screen.getByText(label).parentElement!
    expect(within(tile('Réussite globale')).getByText('50 %')).toBeTruthy() // 3/6
    expect(within(tile('Examens réussis')).getByText('1 / 2')).toBeTruthy()

    const weak = screen.getByText('Objectifs à retravailler').closest('section')!
    expect(within(weak).getByText('FL-1.3.1')).toBeTruthy()
    expect(within(weak).queryByText('FL-1.1.1')).toBeNull()
    expect(within(weak).getByRole('link', { name: 'S’entraîner →' }).getAttribute('href')).toBe(
      '/practice?lo=FL-1.3.1',
    )

    // Latest exam is described by default; hovering another point describes it.
    expect(screen.getByText(/Dernier examen : .* 30\/40 · 75 % · réussi/)).toBeTruthy()
    const first = screen.getByRole('link', { name: /20\/40 · 50 % · échoué/ })
    expect(first.getAttribute('href')).toBe('/exam/e1')
    await userEvent.setup().hover(first)
    expect(screen.queryByText(/Dernier examen/)).toBeNull()
  })
})
