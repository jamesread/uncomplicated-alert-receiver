const KARMA_BY_WEIGHT = {
  1: 'bad',
  2: 'severe',
  3: 'warning',
  4: 'old',
  5: 'note'
}

export function karmaClassForWeight (weight) {
  return KARMA_BY_WEIGHT[weight] || ''
}

export function karmaClassForSeverity (severity, severityWeighting) {
  if (!severity || !severityWeighting.has(severity)) {
    return ''
  }
  return karmaClassForWeight(severityWeighting.get(severity))
}

export function visibleLabels (labels, ignoredLabels, drawLabels) {
  if (!drawLabels || !labels) {
    return []
  }

  const ignored = ignoredLabels || []
  const result = []

  if (Object.prototype.hasOwnProperty.call(labels, 'severity')) {
    result.push({ key: 'severity', value: labels.severity })
  }

  for (const key of Object.keys(labels)) {
    if (key === 'severity') {
      continue
    }
    if (ignored.includes(key)) {
      continue
    }
    result.push({ key, value: labels[key] })
  }

  return result
}
