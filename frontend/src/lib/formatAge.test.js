import { describe, expect, it } from 'vitest'
import { formatCompactAge, formatStartsAtAge } from './formatAge.js'

describe('formatCompactAge', () => {
  it('formats past ages with the largest unit', () => {
    expect(formatCompactAge(-1)).toBe('1s ago')
    expect(formatCompactAge(-59)).toBe('59s ago')
    expect(formatCompactAge(-60)).toBe('1m ago')
    expect(formatCompactAge(-3600)).toBe('1h ago')
    expect(formatCompactAge(-86400)).toBe('1d ago')
  })

  it('formats future ages with an in- prefix', () => {
    expect(formatCompactAge(5)).toBe('in 5s')
    expect(formatCompactAge(120)).toBe('in 2m')
  })

  it('formats a zero delta as 0s ago', () => {
    expect(formatCompactAge(0)).toBe('0s ago')
  })
})

describe('formatStartsAtAge', () => {
  const now = Date.parse('2026-09-01T17:00:00Z')

  it('formats age from an Alertmanager startsAt timestamp', () => {
    expect(formatStartsAtAge('2026-09-01T15:00:00Z', now)).toBe('2h ago')
    expect(formatStartsAtAge('2026-08-31T17:00:00Z', now)).toBe('1d ago')
  })

  it('hides missing, invalid, and Go zero timestamps', () => {
    expect(formatStartsAtAge('', now)).toBe('')
    expect(formatStartsAtAge(undefined, now)).toBe('')
    expect(formatStartsAtAge('not-a-date', now)).toBe('')
    expect(formatStartsAtAge('0001-01-01T00:00:00Z', now)).toBe('')
  })
})
