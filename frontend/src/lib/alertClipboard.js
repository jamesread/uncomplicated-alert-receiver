function sortedEntries (map) {
  return Object.keys(map || {}).sort().map(key => [key, map[key]])
}

function formatMapSection (title, map) {
  const entries = sortedEntries(map)
  if (!entries.length) {
    return ''
  }

  const lines = entries.map(([key, value]) => `- ${key}: ${value}`)
  return `## ${title}\n${lines.join('\n')}`
}

export function formatAlertForLlm ({ summary, labels, annotations, alertmanagerUrl } = {}) {
  const parts = [
    '# Prometheus alert',
    summary || '(no summary)',
    formatMapSection('Labels', labels),
    formatMapSection('Annotations', annotations)
  ]

  const url = typeof alertmanagerUrl === 'string' ? alertmanagerUrl.trim() : ''
  if (url && url !== '#') {
    parts.push(`## Alertmanager\n${url}`)
  }

  return parts.filter(Boolean).join('\n\n') + '\n'
}

export async function copyText (text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(ta)
  }
}
