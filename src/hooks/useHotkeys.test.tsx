// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeKey, useHotkeys, type HotkeyBindings } from './useHotkeys.ts'

afterEach(cleanup)

function Harness({ bindings, enabled = true }: { bindings: HotkeyBindings; enabled?: boolean }) {
  useHotkeys(bindings, enabled)
  return (
    <div>
      <input aria-label="texte" />
      <input type="radio" aria-label="option" />
      <button type="button">bouton</button>
      <div data-hotkeys="off">
        <span tabIndex={0}>zone</span>
      </div>
    </div>
  )
}

describe('normalizeKey', () => {
  it('normalizes space and case', () => {
    expect(normalizeKey(' ')).toBe('space')
    expect(normalizeKey('Enter')).toBe('enter')
    expect(normalizeKey('V')).toBe('v')
  })
})

describe('useHotkeys', () => {
  it('runs the bound action', async () => {
    const one = vi.fn()
    const enter = vi.fn()
    render(<Harness bindings={{ '1': one, enter }} />)
    await userEvent.keyboard('1{Enter}')
    expect(one).toHaveBeenCalledOnce()
    expect(enter).toHaveBeenCalledOnce()
  })

  it('does nothing when disabled or with modifiers', async () => {
    const one = vi.fn()
    const { rerender } = render(<Harness bindings={{ '1': one }} enabled={false} />)
    await userEvent.keyboard('1')
    rerender(<Harness bindings={{ '1': one }} />)
    await userEvent.keyboard('{Control>}1{/Control}')
    expect(one).not.toHaveBeenCalled()
  })

  it('stays out of text fields and opted-out areas', async () => {
    const v = vi.fn()
    const user = userEvent.setup()
    render(<Harness bindings={{ v }} />)
    await user.type(screen.getByLabelText('texte'), 'v')
    screen.getByText('zone').focus()
    await user.keyboard('v')
    expect(v).not.toHaveBeenCalled()
  })

  it('lets focused controls handle Enter and Space, but not other keys', async () => {
    const enter = vi.fn()
    const two = vi.fn()
    const user = userEvent.setup()
    render(<Harness bindings={{ enter, '2': two }} />)
    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    screen.getByLabelText('option').focus()
    await user.keyboard('{Enter}2')
    expect(enter).not.toHaveBeenCalled()
    expect(two).toHaveBeenCalledOnce()
  })
})
