export function formatCompactAge (deltaSeconds) {
  const isFuture = deltaSeconds > 0
  let remaining = Math.abs(deltaSeconds)

  const units = [
    { seconds: 86400, suffix: 'd' },
    { seconds: 3600, suffix: 'h' },
    { seconds: 60, suffix: 'm' },
    { seconds: 1, suffix: 's' }
  ]

  let formatted = '0s'
  for (const unit of units) {
    if (remaining >= unit.seconds || unit.suffix === 's') {
      formatted = Math.floor(remaining / unit.seconds) + unit.suffix
      break
    }
  }

  return isFuture ? 'in ' + formatted : formatted + ' ago'
}

export function formatStartsAtAge (startsAt, now = Date.now()) {
  if (!startsAt) {
    return ''
  }

  const started = new Date(startsAt)
  if (Number.isNaN(started.getTime()) || started.getUTCFullYear() < 1970) {
    return ''
  }

  return formatCompactAge(Math.floor((started.getTime() - now) / 1000))
}
