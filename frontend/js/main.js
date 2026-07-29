'use strict'

import 'femtocrank/style.css'
import { Cancel01Icon } from '@hugeicons/core-free-icons';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}

window.severityWeighting = new Map()
window.settings = { DrawLabels: false, IgnoredLabels: [] }

const DRAW_LABELS_STORAGE_KEY = 'uar.drawLabels'
window.drawLabels = loadDrawLabelsPreference()
window.labelFilters = []
window.filterEditMode = false
window.lastAlertResponse = null
window.settingsReady = false

export default function main () {
  window.baseUrl = window.location.origin

  window.timeUntilNextUpdate = 30

  window.intervalTimer = setInterval(updateProgressBar, 1000)

  updateSettings()
  fetchAlertList()
  setupDropdownMenu()
  setupFullscreenButton()
  setupToggleLabelsButton()
  setupFilterBar()
  setupOfflineDetection()
  setupPwaHeaderClasses()
}

function loadDrawLabelsPreference () {
  const stored = window.localStorage.getItem(DRAW_LABELS_STORAGE_KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return null
}

function shouldDrawLabels () {
  if (window.drawLabels !== null) {
    return window.drawLabels
  }
  return Boolean(window.settings && window.settings.DrawLabels)
}

function setDrawLabelsPreference (enabled) {
  window.drawLabels = enabled
  window.localStorage.setItem(DRAW_LABELS_STORAGE_KEY, enabled ? '1' : '0')
  updateToggleLabelsButton()
  renderAlertList()
}

function updateToggleLabelsButton () {
  const btn = document.getElementById('toggle-labels-btn')
  const text = document.getElementById('toggle-labels-text')
  if (!btn || !text) return

  const enabled = shouldDrawLabels()
  btn.setAttribute('aria-pressed', enabled ? 'true' : 'false')
  text.textContent = enabled ? 'Hide labels' : 'Show labels'
}

function setupPwaHeaderClasses () {
  const header = document.querySelector('header')
  if (!header) return

  const displayModeQueries = [
    window.matchMedia('(display-mode: standalone)'),
    window.matchMedia('(display-mode: fullscreen)'),
    window.matchMedia('(display-mode: minimal-ui)'),
    window.matchMedia('(display-mode: window-controls-overlay)')
  ]
  const wcoQuery = displayModeQueries[3]

  function isPwa () {
    return displayModeQueries.some(q => q.matches)
  }

  function updateHeaderClasses () {
    if (isPwa()) {
      header.classList.add('pwa')
    } else {
      header.classList.remove('pwa')
    }
    if (wcoQuery.matches) {
      header.classList.add('wco')
    } else {
      header.classList.remove('wco')
    }
  }

  updateHeaderClasses()
  displayModeQueries.forEach(q => q.addEventListener('change', updateHeaderClasses))
}

function setupOfflineDetection () {
  const offlineMessage = document.getElementById('offline-message')
  const alertList = document.getElementById('alert-list')

  function showOffline () {
    if (offlineMessage && alertList) {
      offlineMessage.hidden = false
      alertList.hidden = true
    }
  }

  function hideOffline () {
    if (offlineMessage && alertList) {
      offlineMessage.hidden = true
      alertList.hidden = false
    }
  }

  function isNetworkError (err) {
    return err instanceof TypeError && (err.message === 'Failed to fetch' || err.message === 'Load failed')
  }

  window.showOfflineMessage = showOffline
  window.hideOfflineMessage = hideOffline
  window.isNetworkError = isNetworkError

  if (!navigator.onLine) {
    showOffline()
  }

  window.addEventListener('online', () => {
    hideOffline()
    window.timeUntilNextUpdate = 0
    fetchAlertList()
    updateSettings()
  })

  window.addEventListener('offline', showOffline)
}

function updateSettings () {
  window.fetch(window.baseUrl + '/api/settings', {
    headers: { Accept: 'application/json' }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Settings request failed: ' + response.status)
      }
      return response.json()
    })
    .then(res => {
      if (window.hideOfflineMessage) window.hideOfflineMessage()
      window.settings = res
      window.severityWeighting = new Map(Object.entries(res.SeverityLabels || {}))
      if (!Array.isArray(window.settings.IgnoredLabels)) {
        window.settings.IgnoredLabels = []
      }
      window.settingsReady = true
      document.getElementById('current-version').innerHTML = 'Version: ' + res.Version
      updateToggleLabelsButton()
      renderAlertList()
    })
    .catch(error => {
      console.error('Fetch error:', error)
      document.getElementById('current-version').innerHTML = 'Error fetching version'
      if (window.isNetworkError && window.isNetworkError(error)) {
        if (window.showOfflineMessage) window.showOfflineMessage()
      }
    })
}
function updateProgressBar () {
  const progressBar = document.getElementById('next-update')

  progressBar.value = 30 - window.timeUntilNextUpdate

  window.timeUntilNextUpdate--

  if (window.timeUntilNextUpdate < 0) {
    fetchAlertList()
    window.timeUntilNextUpdate = 30
  }
}

function fetchAlertList () {
  window.fetch(window.baseUrl + '/api/alert_list', {
    headers: { Accept: 'application/json' }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Alert list request failed: ' + response.status)
      }
      return response.json()
    })
    .then(res => {
      if (window.hideOfflineMessage) window.hideOfflineMessage()

      window.lastAlertResponse = res
      renderLastUpdated(res)
      if (window.settingsReady) {
        renderAlertList()
      }
    }).catch(error => {
      console.error('Fetch error:', error)

      document.getElementById('last-updated').textContent = 'Fetch error'
      document.getElementById('last-updated').classList.add('critical')
      if (window.isNetworkError && window.isNetworkError(error)) {
        if (window.showOfflineMessage) window.showOfflineMessage()
      }
    })
}

function renderAlertList () {
  const alertList = document.getElementById('alert-list')
  if (!alertList || !window.settingsReady) return

  alertList.innerHTML = ''

  const res = window.lastAlertResponse
  if (!res || !res.Alerts) return

  for (const alert of Object.keys(res.Alerts)) {
    const alertData = res.Alerts[alert]
    if (!alertMatchesFilters(alertData)) {
      continue
    }
    alertList.appendChild(renderAlert(alertData))
  }
}

function severityMatches (alertSeverity, filterSeverity) {
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

function alertMatchesFilters (alert) {
  if (!window.labelFilters.length) {
    return true
  }

  const labels = alert.Labels || {}
  return window.labelFilters.every(filter => {
    if (filter.key === 'severity') {
      return severityMatches(labels.severity, filter.value)
    }
    return labels[filter.key] === filter.value
  })
}

function filterKey (key, value) {
  return key + '=' + value
}

function addLabelFilter (key, value) {
  const id = filterKey(key, value)
  if (window.labelFilters.some(f => filterKey(f.key, f.value) === id)) {
    return
  }

  window.labelFilters.push({ key, value })
  window.filterEditMode = false
  renderFilterBar()
  renderAlertList()
}

function removeLabelFilter (key, value) {
  const id = filterKey(key, value)
  window.labelFilters = window.labelFilters.filter(f => filterKey(f.key, f.value) !== id)
  renderFilterBar()
  renderAlertList()
}

function clearLabelFilters () {
  window.labelFilters = []
  window.filterEditMode = false
  renderFilterBar()
  renderAlertList()
}

function filtersToText (filters) {
  return filters.map(f => filterKey(f.key, f.value)).join(' ')
}

function parseFiltersFromText (text) {
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

function submitFilterEdit () {
  const input = document.getElementById('filter-edit-input')
  if (!input) return

  window.labelFilters = parseFiltersFromText(input.value)
  window.filterEditMode = false
  renderFilterBar()
  renderAlertList()
}

function setFilterEditMode (enabled) {
  window.filterEditMode = enabled
  renderFilterBar()

  if (enabled) {
    const input = document.getElementById('filter-edit-input')
    if (input) {
      input.focus()
      input.select()
    }
  }
}

function createLabelElement (key, value, { onClick, title } = {}) {
  const labelElement = document.createElement(onClick ? 'button' : 'span')
  labelElement.classList.add('label')
  if (onClick) {
    labelElement.type = 'button'
  }
  const fullLabel = key + '=' + value
  labelElement.title = title ? fullLabel + ' — ' + title : fullLabel

  const keyElement = document.createElement('span')
  keyElement.classList.add('key')
  keyElement.textContent = key
  labelElement.appendChild(keyElement)

  const valElement = document.createElement('span')
  valElement.classList.add('val')
  valElement.textContent = value
  labelElement.appendChild(valElement)

  if (onClick) {
    labelElement.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    })
  }

  return labelElement
}

function createHugeiconSvg (icon, { size = 16 } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')

  for (const [tag, attrs] of icon) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
    for (const [name, value] of Object.entries(attrs)) {
      if (name === 'key') continue
      el.setAttribute(name, String(value))
    }
    svg.appendChild(el)
  }

  return svg
}

function createFilterChip (key, value) {
  const chip = document.createElement('div')
  chip.classList.add('filter-bar__chip')

  chip.appendChild(createLabelElement(key, value))

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.classList.add('filter-bar__chip-close')
  closeBtn.setAttribute('aria-label', 'Remove filter ' + filterKey(key, value))
  closeBtn.title = 'Remove filter'
  closeBtn.appendChild(createHugeiconSvg(Cancel01Icon, { size: 14 }))
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    removeLabelFilter(key, value)
  })
  chip.appendChild(closeBtn)

  return chip
}

function renderFilterBar () {
  const filterBar = document.getElementById('filter-bar')
  const chips = document.getElementById('active-filters')
  const editForm = document.getElementById('filter-edit-form')
  const input = document.getElementById('filter-edit-input')
  const editBtn = document.getElementById('edit-filters-btn')
  if (!filterBar || !chips || !editForm || !input || !editBtn) return

  chips.innerHTML = ''

  const editing = window.filterEditMode
  const hasFilters = window.labelFilters.length > 0

  if (!hasFilters && !editing) {
    filterBar.hidden = true
    editForm.hidden = true
    chips.hidden = false
    return
  }

  filterBar.hidden = false
  editForm.hidden = !editing
  chips.hidden = editing

  if (editing) {
    input.value = filtersToText(window.labelFilters)
    return
  }

  for (const filter of window.labelFilters) {
    chips.appendChild(createFilterChip(filter.key, filter.value))
  }
}

function setupFilterBar () {
  const clearBtn = document.getElementById('clear-filters-btn')
  const editBtn = document.getElementById('edit-filters-btn')
  const editForm = document.getElementById('filter-edit-form')
  if (!clearBtn || !editBtn || !editForm) return

  clearBtn.addEventListener('click', () => {
    clearLabelFilters()
  })

  editBtn.addEventListener('click', () => {
    if (window.filterEditMode) {
      setFilterEditMode(false)
    } else {
      setFilterEditMode(true)
    }
  })

  editForm.addEventListener('submit', (e) => {
    e.preventDefault()
    submitFilterEdit()
  })

  renderFilterBar()
}

function formatCompactAge (deltaSeconds) {
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

function renderLastUpdated (res) {
  const lastUpdatedEl = document.getElementById('last-updated')
  lastUpdatedEl.classList.remove('critical', 'info')

  const alertCount = res.Alerts ? Object.keys(res.Alerts).length : 0

  if (res.LastUpdated > 0) {
    const lastUpdatedDate = new Date(res.LastUpdated * 1000)
    const deltaLastUpdated = Math.floor((lastUpdatedDate - new Date()) / 1000)

    lastUpdatedEl.textContent = formatCompactAge(deltaLastUpdated)
    lastUpdatedEl.title = 'Last payload from AlertManager: ' + lastUpdatedDate.toLocaleString()

    if (deltaLastUpdated < -100 && alertCount > 0) {
      lastUpdatedEl.classList.add('critical')
    } else if (deltaLastUpdated > 0) {
      lastUpdatedEl.classList.add('info')
    }
  } else if (res.LastUpdated === 0) {
    lastUpdatedEl.textContent = 'Nothing received from Alertmanager yet'
    lastUpdatedEl.classList.add('critical')
  }
}

function renderAlert (alert) {
  const linkElement = document.createElement('a')
  linkElement.href = alert.Metadata.AlertManagerUrl
  linkElement.target = '_blank'
  linkElement.textContent = alert.Annotations.summary

  const alertElement = document.createElement('div')
  alertElement.classList.add('alert')
  alertElement.appendChild(linkElement)

  if ('severity' in alert.Labels) {
    if (severityWeighting.has(alert.Labels.severity)) {
      alertElement.classList.add('sev' + severityWeighting.get(alert.Labels.severity))
    } else {
      alertElement.style.order = '10'
    }
  } else {
    alertElement.style.order = '10'
  }

  if (shouldDrawLabels() && alert.Labels) {
    const ignored = (window.settings && window.settings.IgnoredLabels) || []

    for (const label of Object.keys(alert.Labels)) {
      // Always show severity so it can be used for filtering; colour already
      // conveys it, but the chip is needed to add/remove severity filters.
      if (label !== 'severity' && ignored.includes(label)) {
        continue
      }

      alertElement.appendChild(createLabelElement(label, alert.Labels[label], {
        title: 'Filter by this label',
        onClick: () => addLabelFilter(label, alert.Labels[label])
      }))
    }
  }

  return alertElement
}

function setupDropdownMenu () {
  const dropdownToggle = document.querySelector('.dropdown-toggle')
  const dropdownMenu = document.querySelector('.dropdown-menu')

  if (!dropdownToggle || !dropdownMenu) return

  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    dropdownMenu.classList.toggle('show')
  })

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show')
    }
  })

  // Close dropdown when pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdownMenu.classList.remove('show')
    }
  })
}

function setupFullscreenButton () {
  const fullscreenBtn = document.getElementById('fullscreen-btn')

  if (!fullscreenBtn) return

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err)
      })
    } else {
      // Exit fullscreen
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err)
      })
    }
  })

  // Update button text based on fullscreen state
  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement
    const icon = fullscreenBtn.querySelector('svg')

    if (isFullscreen) {
      // Change to exit fullscreen icon
      icon.innerHTML = '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
    } else {
      // Change to enter fullscreen icon
      icon.innerHTML = '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'
    }
  })
}

function setupToggleLabelsButton () {
  const toggleBtn = document.getElementById('toggle-labels-btn')

  if (!toggleBtn) return

  updateToggleLabelsButton()

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDrawLabelsPreference(!shouldDrawLabels())
  })
}
