import { describe, expect, it } from 'vitest'
import {
  alertMatchesFilters,
  filterKey,
  filtersToText,
  parseFiltersFromText,
  severityMatches
} from './filters.js'

describe('parseFiltersFromText', () => {
  it('parses unique key=value tokens', () => {
    expect(parseFiltersFromText('severity=crit job=up')).toEqual([
      { key: 'severity', value: 'crit' },
      { key: 'job', value: 'up' }
    ])
  })

  it('skips invalid tokens and duplicates', () => {
    expect(parseFiltersFromText('=x foo= bar severity=crit severity=crit')).toEqual([
      { key: 'severity', value: 'crit' }
    ])
  })

  it('returns an empty list for blank input', () => {
    expect(parseFiltersFromText('   ')).toEqual([])
  })
})

describe('filtersToText', () => {
  it('joins filters as key=value tokens', () => {
    expect(filtersToText([{ key: 'job', value: 'up' }, { key: 'env', value: 'prod' }])).toBe('job=up env=prod')
  })
})

describe('severityMatches', () => {
  const weights = new Map([['crit', 1], ['critical', 1], ['warning', 3]])

  it('matches equal strings and same-weight aliases', () => {
    expect(severityMatches('crit', 'crit', weights)).toBe(true)
    expect(severityMatches('crit', 'critical', weights)).toBe(true)
  })

  it('rejects different weights or unknown labels', () => {
    expect(severityMatches('crit', 'warning', weights)).toBe(false)
    expect(severityMatches('page', 'crit', weights)).toBe(false)
    expect(severityMatches('', 'crit', weights)).toBe(false)
  })
})

describe('alertMatchesFilters', () => {
  const weights = new Map([['crit', 1], ['critical', 1]])
  const alert = { Labels: { severity: 'crit', job: 'up' } }

  it('matches when every filter is satisfied', () => {
    expect(alertMatchesFilters(alert, [], weights)).toBe(true)
    expect(alertMatchesFilters(alert, [{ key: 'job', value: 'up' }], weights)).toBe(true)
    expect(alertMatchesFilters(alert, [{ key: 'severity', value: 'critical' }], weights)).toBe(true)
  })

  it('rejects a missing label or failed severity alias', () => {
    expect(alertMatchesFilters(alert, [{ key: 'job', value: 'disk' }], weights)).toBe(false)
    expect(alertMatchesFilters(alert, [{ key: 'severity', value: 'warning' }], weights)).toBe(false)
  })
})

describe('filterKey', () => {
  it('joins key and value', () => {
    expect(filterKey('job', 'up')).toBe('job=up')
  })
})
