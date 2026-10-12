// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCard } from '../../data/cards.ts'
import type { Card } from '../../data/schema.ts'
import { getOption } from '../../test/options.ts'
import CardPlayer from './CardPlayer.tsx'

afterEach(cleanup)

function cardOfType<T extends Card['type']>(id: string, type: T): Extract<Card, { type: T }> {
  const card = getCard(id)
  if (card?.type !== type) throw new Error(`Fixture ${id} is not a ${type} card`)
  return card as Extract<Card, { type: T }>
}

function setup(card: Card) {
  const onGraded = vi.fn()
  render(<CardPlayer card={card} onGraded={onGraded} renderActions={() => <p>actions</p>} />)
  return { user: userEvent.setup(), onGraded }
}

describe('CardPlayer', () => {
  it('reveals a flashcard answer without grading it', async () => {
    const card = cardOfType('c1-001', 'flashcard')
    const { user, onGraded } = setup(card)

    expect(screen.queryByText(card.answer)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(screen.getByText(card.answer)).toBeTruthy()
    expect(onGraded).toHaveBeenCalledWith(expect.objectContaining({ correct: null }))
    expect(screen.getByText('actions')).toBeTruthy()
  })

  it('grades a single-answer mcq', async () => {
    const card = cardOfType('c1-003', 'mcq')
    const { user, onGraded } = setup(card)
    const submit = screen.getByRole('button', { name: 'Valider' })

    expect((submit as HTMLButtonElement).disabled).toBe(true)
    const wrong = card.options.findIndex((_, i) => !card.correct.includes(i))
    await user.click(getOption(card.options[wrong]))
    await user.click(getOption(card.options[card.correct[0]]))
    await user.click(submit)

    expect(onGraded).toHaveBeenCalledWith(expect.objectContaining({ correct: true }))
    expect(screen.getByText('✓ Bonne réponse !')).toBeTruthy()
    expect(screen.getByText(card.explanation!)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull()
  })

  it('shows mcq options in a shuffled order, with shortcuts following the display', async () => {
    const card = cardOfType('c1-003', 'mcq')
    // Fisher–Yates with random() = 0 always swaps with the first item: [1, 2, 3, 0].
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { user } = setup(card)
    random.mockRestore()

    const labels = screen.getAllByRole('radio').map((input) => input.closest('label')!.textContent)
    expect(labels).toEqual([1, 2, 3, 0].map((i, pos) => `${'ABCD'[pos]}.${card.options[i]}`))

    await user.keyboard('1')
    expect(getOption(card.options[1]).checked).toBe(true)
  })

  it('requires every correct option of a multi-answer mcq', async () => {
    const card = cardOfType('c1-006', 'mcq')
    const { user, onGraded } = setup(card)

    expect(screen.getByText(`Sélectionne ${card.correct.length} réponses.`)).toBeTruthy()
    await user.click(getOption(card.options[card.correct[0]]))
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(onGraded).toHaveBeenCalledWith(expect.objectContaining({ correct: false }))
    expect(screen.getByText('✗ Mauvaise réponse')).toBeTruthy()
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect((checkbox as HTMLInputElement).disabled).toBe(true)
    }
  })

  it('grades a true/false card', async () => {
    const card = cardOfType('c1-002', 'true_false')
    const { user, onGraded } = setup(card)

    await user.click(screen.getByRole('radio', { name: card.answer ? 'Faux' : 'Vrai' }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(onGraded).toHaveBeenCalledWith(expect.objectContaining({ correct: false }))
  })

  it('grades an ordering card rearranged with the arrow buttons', async () => {
    const card = cardOfType('c1-045', 'ordering')
    const { user, onGraded } = setup(card)

    const currentOrder = () =>
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((li) => card.items.find((item) => li.textContent?.includes(item))!)

    for (const [target, item] of card.items.entries()) {
      while (currentOrder().indexOf(item) > target) {
        await user.click(screen.getByRole('button', { name: `Monter « ${item} »` }))
      }
    }
    expect(currentOrder()).toEqual(card.items)

    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(onGraded).toHaveBeenCalledWith(expect.objectContaining({ correct: true }))
  })

  it('shows the expected order when an ordering card is wrong', async () => {
    const card = cardOfType('c1-010', 'ordering')
    const { user, onGraded } = setup(card)

    // The initial shuffle is guaranteed to differ from the correct order.
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(onGraded).toHaveBeenCalledWith(expect.objectContaining({ correct: false }))
    expect(screen.getByText('Ordre attendu :')).toBeTruthy()
  })
})
