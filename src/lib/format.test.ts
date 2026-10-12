import { describe, expect, it } from 'vitest'
import { formatDueDate, percent } from './format.ts'

describe('formatDueDate', () => {
  const now = new Date(2026, 9, 12, 10, 0)

  it('formats today, tomorrow and later dates', () => {
    expect(formatDueDate(new Date(2026, 9, 12, 14, 30), now)).toBe('aujourd’hui à 14:30')
    expect(formatDueDate(new Date(2026, 9, 13, 9, 5), now)).toBe('demain à 09:05')
    expect(formatDueDate(new Date(2026, 9, 20, 9, 0), now)).toBe('le mardi 20 octobre')
  })
})

describe('percent', () => {
  it('rounds and handles an empty total', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(0, 0)).toBe(0)
  })
})
