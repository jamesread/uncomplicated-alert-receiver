import { describe, expect, it } from 'vitest'
import { karmaClassForSeverity, karmaClassForWeight, visibleLabels } from './severity.js'

describe('karmaClassForWeight', () => {
  it('maps UAR severity weights to femtocrank karma classes', () => {
    expect(karmaClassForWeight(1)).toBe('bad')
    expect(karmaClassForWeight(2)).toBe('severe')
    expect(karmaClassForWeight(3)).toBe('warning')
    expect(karmaClassForWeight(4)).toBe('old')
    expect(karmaClassForWeight(5)).toBe('note')
    expect(karmaClassForWeight(9)).toBe('')
  })
})

describe('karmaClassForSeverity', () => {
  const weights = new Map([['crit', 1], ['info', 5]])

  it('returns the karma class for a known severity label', () => {
    expect(karmaClassForSeverity('crit', weights)).toBe('bad')
    expect(karmaClassForSeverity('info', weights)).toBe('note')
  })

  it('returns empty when the label is missing or unknown', () => {
    expect(karmaClassForSeverity('', weights)).toBe('')
    expect(karmaClassForSeverity('page', weights)).toBe('')
  })
})

describe('visibleLabels', () => {
  const labels = { severity: 'crit', job: 'up', instance: 'a' }

  it('returns no labels when drawing is disabled', () => {
    expect(visibleLabels(labels, ['job'], false)).toEqual([])
  })

  it('puts severity first even when it is in the ignored list', () => {
    expect(visibleLabels({ job: 'up', severity: 'crit', instance: 'a' }, ['job', 'severity'], true)).toEqual([
      { key: 'severity', value: 'crit' },
      { key: 'instance', value: 'a' }
    ])
  })
})
