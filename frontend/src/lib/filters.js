export function filterKey (key, value) {
  return key + '=' + value
}

export function filtersToText (filters) {
  return filters.map(f => filterKey(f.key, f.value)).join(' ')
}

export function parseFiltersFromText (text) {
  const filters = []
  const seen = new Set()

  for (const token of text.trim().split(/\s+/)) {
    if (!token) continue

    const eq = token.indexOf('=')
    if (eq <= 0 || eq === token.length - 1) continue

    const key = token.slice(0, eq)
    const value = token.slice(eq + 1)
    const id = filterKey(key, value)
    if (seen.has(id)) continue

    seen.add(id)
    filters.push({ key, value })
  }

  return filters
}

export function severityMatches (alertSeverity, filterSeverity, severityWeighting) {
  if (alertSeverity === filterSeverity) {
    return true
  }
  if (!alertSeverity || !filterSeverity) {
    return false
  }
  if (!severityWeighting.has(alertSeverity) || !severityWeighting.has(filterSeverity)) {
    return false
  }
  return severityWeighting.get(alertSeverity) === severityWeighting.get(filterSeverity)
}

export function alertMatchesFilters (alert, filters, severityWeighting) {
  if (!filters.length) {
    return true
  }

  const labels = alert.Labels || {}
  return filters.every(filter => {
    if (filter.key === 'severity') {
      return severityMatches(labels.severity, filter.value, severityWeighting)
    }
    return labels[filter.key] === filter.value
  })
}
