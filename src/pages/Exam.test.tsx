// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { cards } from '../data/cards.ts'
import { createExam, planExam, startExam } from '../lib/exam.ts'
import { createDefaultState, saveState, STORAGE_KEY, type StoredState } from '../lib/storage.ts'
import { StoreProvider } from '../state/store.tsx'
import { memoryStorage } from '../test/memoryStorage.ts'
import { getOption } from '../test/options.ts'
import Exam from './Exam.tsx'
import ExamResultPage from './exam/ExamResultPage.tsx'

afterEach(cleanup)

function setup(initial: StoredState = createDefaultState()) {
  const storage = memoryStorage()
  saveState(initial, storage)
  render(
    <StoreProvider storage={storage}>
      <MemoryRouter initialEntries={['/exam']}>
        <Routes>
          <Route path="/exam" element={<Exam />} />
          <Route path="/exam/:id" element={<ExamResultPage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  )
  const stored = () => JSON.parse(storage.data.get(STORAGE_KEY)!) as StoredState
  return { user: userEvent.setup(), stored }
}

function currentMcq() {
  const question = screen.getByRole('heading', { level: 2 }).textContent
  const card = cards.find((c) => c.question === question)
  if (card?.type !== 'mcq') throw new Error('Current question is not an MCQ')
  return card
}

describe('Exam pages', () => {
  it('runs an exam from start to result without touching the review schedule', async () => {
    const { user, stored } = setup()

    // The warning depends on which chapters have cards yet.
    const plan = planExam()
    if (plan.warning) expect(screen.getByRole('note').textContent).toContain(plan.warning)
    else expect(screen.queryByRole('note')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Démarrer l’examen' }))

    expect(screen.getByText('Question 1 / 40')).toBeTruthy()
    expect(screen.getByRole('timer').textContent).toMatch(/1:00:00|59:5\d/)

    // Question 1: correct answer.
    const first = currentMcq()
    for (const index of first.correct) await user.click(getOption(first.options[index]))
    expect(screen.getByText('1/40 répondues')).toBeTruthy()

    // Question 2: flagged, left unanswered.
    await user.click(screen.getByRole('button', { name: 'Suivante →' }))
    await user.click(screen.getByRole('button', { name: /Marquer à revoir/ }))
    const grid = screen.getByRole('navigation', { name: 'Questions' })
    expect(
      within(grid).getByRole('button', { name: 'Question 2, sans réponse, marquée' }),
    ).toBeTruthy()
    expect(within(grid).getByRole('button', { name: 'Question 1, répondue' })).toBeTruthy()

    // Navigation through the grid.
    await user.click(within(grid).getByRole('button', { name: /^Question 40,/ }))
    expect(screen.getByText('Question 40 / 40')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(screen.getByText(/Il reste 39 questions sans réponse/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Terminer et corriger' }))

    expect(screen.getByText('Résultat de l’examen blanc')).toBeTruthy()
    // Global score, and chapter 1 breakdown (questions are drawn in chapter order).
    expect(screen.getAllByText('1/40').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(`1/${plan.quotas[1]}`).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Échoué')).toBeTruthy()
    expect(screen.getAllByText('✗ Sans réponse')).toHaveLength(39)

    await user.click(screen.getByRole('checkbox', { name: 'Uniquement les erreurs' }))
    expect(screen.queryByText('✓ Juste')).toBeNull()

    const state = stored()
    expect(state.currentExam).toBeUndefined()
    expect(state.exams).toHaveLength(1)
    expect(state.exams[0]).toMatchObject({ score: 1, passMark: 26, timedOut: false })
    expect(state.srs).toEqual({})
    expect(state.answers).toEqual([])
  })

  it('resumes an exam in progress after a reload', () => {
    const exam = createExam(new Date(Date.now() - 10 * 60_000))
    const state = startExam(createDefaultState(), {
      ...exam,
      answers: { [exam.questions[0]]: [0], [exam.questions[1]]: [1] },
    })
    setup(state)

    expect(screen.getByText('2/40 répondues')).toBeTruthy()
    expect(screen.getByRole('timer').textContent).toMatch(/^⏱ (50:00|49:5\d)$/)
  })

  it('submits automatically when the time is over', async () => {
    const exam = createExam(new Date(Date.now() - 2 * 3600_000))
    const { stored } = setup(startExam(createDefaultState(), exam))

    expect(await screen.findByText('Résultat de l’examen blanc')).toBeTruthy()
    expect(screen.getByText(/temps écoulé/)).toBeTruthy()
    expect(stored().exams[0]).toMatchObject({ timedOut: true, elapsedSec: 3600 })
  })

  it('abandons an exam without result', async () => {
    const { user, stored } = setup()
    await user.click(screen.getByRole('button', { name: 'Démarrer l’examen' }))
    await user.click(screen.getByRole('button', { name: 'Terminer' }))
    await user.click(screen.getByRole('button', { name: 'Abandonner sans résultat' }))
    await user.click(screen.getByRole('button', { name: 'Oui, abandonner' }))

    expect(screen.getByRole('button', { name: 'Démarrer l’examen' })).toBeTruthy()
    expect(screen.getByText('Aucun examen passé pour l’instant.')).toBeTruthy()
    expect(stored().currentExam).toBeUndefined()
    expect(stored().exams).toEqual([])
  })

  it('lists past exams in the history', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Démarrer l’examen' }))
    await user.click(screen.getByRole('button', { name: 'Terminer' }))
    await user.click(screen.getByRole('button', { name: 'Terminer et corriger' }))
    await user.click(screen.getByRole('link', { name: '← Retour aux examens' }))

    expect(screen.getByRole('link', { name: /0\/40 · 0 %.*Échoué/ })).toBeTruthy()
  })

  it('supports keyboard navigation, answers and flags', async () => {
    const { user, stored } = setup()
    await user.click(screen.getByRole('button', { name: 'Démarrer l’examen' }))

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Question 2 / 40')).toBeTruthy()
    await user.keyboard('1f')
    expect(screen.getByText('1/40 répondues')).toBeTruthy()
    const exam = stored().currentExam!
    // "1" selects the first option on screen, stored by its authored index.
    expect(exam.answers[exam.questions[1]]).toEqual([exam.optionOrders![exam.questions[1]][0]])
    expect(exam.flagged).toEqual([exam.questions[1]])

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByText('Question 1 / 40')).toBeTruthy()
  })
})
