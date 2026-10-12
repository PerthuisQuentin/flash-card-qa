import { screen } from '@testing-library/react'

/**
 * Input of the MCQ option with this exact text. Options are shuffled on display,
 * so tests find them by text rather than by position.
 */
export function getOption(text: string): HTMLInputElement {
  const input = screen
    .getByText(text, { selector: 'span' })
    .closest('label')
    ?.querySelector('input')
  if (!input) throw new Error(`No option input for "${text}"`)
  return input
}
