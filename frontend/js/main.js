'use strict'

import 'femtocrank/style.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}

window.severityWeighting = new Map();

export default function main () {
  window.baseUrl = window.location.origin

  window.timeUntilNextUpdate = 0

  window.intervalTimer = setInterval(updateProgressBar, 1000)

  updateSettings()
  setupDropdownMenu()
  setupFullscreenButton()
  setupOfflineDetection()
  setupPwaHeaderClasses()
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
      window.severityWeighting = new Map(Object.entries(res.SeverityLabels))
      document.getElementById('current-version').innerHTML = 'Version: ' + res.Version
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
  const alertList = document.getElementById('alert-list')
  alertList.innerHTML = ''

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

      const alerts = res.Alerts

      for (const alert of Object.keys(alerts)) {
        alertList.appendChild(renderAlert(alerts[alert]))
      }

      renderLastUpdated(res)
    }).catch(error => {
      console.error('Fetch error:', error)

      document.getElementById('last-updated').textContent = 'Fetch error'
      document.getElementById('last-updated').classList.add('critical')
      if (window.isNetworkError && window.isNetworkError(error)) {
        if (window.showOfflineMessage) window.showOfflineMessage()
      }
    })
}

function renderLastUpdated (res) {
  const lastUpdatedEl = document.getElementById('last-updated')
  lastUpdatedEl.classList.remove('critical', 'info')

  if (res.LastUpdated > 0) {
    const lastUpdatedDate = new Date(res.LastUpdated * 1000)
    const deltaLastUpdated = Math.floor((lastUpdatedDate - new Date()) / 1000)
    const formatter = new Intl.RelativeTimeFormat()

    lastUpdatedEl.textContent = formatter.format(deltaLastUpdated, 'seconds')
    lastUpdatedEl.title = 'Last payload from AlertManager: ' + lastUpdatedDate.toLocaleString()

    if (deltaLastUpdated < -100) {
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

  if (window.settings.DrawLabels) {
    for (const label of Object.keys(alert.Labels)) {
      if (window.settings.IgnoredLabels.includes(label)) {
        continue
      }

      const labelElement = document.createElement('span')
      labelElement.classList.add('label')

      const keyElement = document.createElement('span')
      keyElement.classList.add('key')
      keyElement.textContent = label
      labelElement.appendChild(keyElement)

      const valElement = document.createElement('span')
      valElement.classList.add('val')
      valElement.textContent = alert.Labels[label]
      labelElement.appendChild(valElement)

      alertElement.appendChild(labelElement)
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
