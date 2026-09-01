import { describe, expect, it } from 'vitest'
import { formatCompactAge } from './formatAge.js'

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
