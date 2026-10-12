import { describe, expect, it } from 'vitest'
import { formatClock, formatDueDate, formatDuration, percent } from './format.ts'

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

describe('formatClock', () => {
  it('formats a countdown', () => {
    expect(formatClock(3600)).toBe('1:00:00')
    expect(formatClock(3547)).toBe('59:07')
    expect(formatClock(5)).toBe('00:05')
    expect(formatClock(-3)).toBe('00:00')
  })
})

describe('formatDuration', () => {
  it('formats elapsed time', () => {
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(12 * 60 + 10)).toBe('12 min')
    expect(formatDuration(65 * 60)).toBe('1 h 05')
  })
})
