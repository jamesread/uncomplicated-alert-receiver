import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { alertMatchesFilters, filterKey, filtersToText, parseFiltersFromText } from '../lib/filters.js'
import { formatCompactAge } from '../lib/formatAge.js'
import { isNetworkError } from '../lib/network.js'
import { karmaClassForSeverity, visibleLabels } from '../lib/severity.js'

const DRAW_LABELS_STORAGE_KEY = 'uar.drawLabels'
const REFRESH_SECONDS = 30

function loadDrawLabelsPreference () {
  const stored = window.localStorage.getItem(DRAW_LABELS_STORAGE_KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return null
}

export function useBoard () {
  const settings = ref({ DrawLabels: false, IgnoredLabels: [], Version: '' })
  const severityWeighting = ref(new Map())
  const settingsReady = ref(false)
  const lastAlertResponse = ref(null)
  const labelFilters = ref([])
  const filterEditMode = ref(false)
  const drawLabelsPreference = ref(loadDrawLabelsPreference())
  const timeUntilNextUpdate = ref(REFRESH_SECONDS)
  const offline = ref(!navigator.onLine)
  const lastUpdatedStatus = ref({ text: 'Never updated', title: '', tone: '' })
  const versionText = ref('')

  const drawLabels = computed(() => {
    if (drawLabelsPreference.value !== null) {
      return drawLabelsPreference.value
    }
    return Boolean(settings.value.DrawLabels)
  })

  const alerts = computed(() => {
    const res = lastAlertResponse.value
    if (!settingsReady.value || !res || !res.Alerts) {
      return []
    }

    const weights = severityWeighting.value
    const ignored = settings.value.IgnoredLabels || []
    const result = []

    for (const key of Object.keys(res.Alerts)) {
      const alert = res.Alerts[key]
      if (!alertMatchesFilters(alert, labelFilters.value, weights)) {
        continue
      }

      const labels = alert.Labels || {}
      result.push({
        key,
        summary: alert.Annotations?.summary || '',
        href: alert.Metadata?.AlertManagerUrl || '#',
        allLabels: labels,
        annotations: alert.Annotations || {},
        labels: visibleLabels(labels, ignored, drawLabels.value).map(label => ({
          ...label,
          karmaClass: label.key === 'severity' ? karmaClassForSeverity(label.value, weights) : ''
        }))
      })
    }

    return result
  })

  const refreshProgress = computed(() => REFRESH_SECONDS - timeUntilNextUpdate.value)

  function setDrawLabelsPreference (enabled) {
    drawLabelsPreference.value = enabled
    window.localStorage.setItem(DRAW_LABELS_STORAGE_KEY, enabled ? '1' : '0')
  }

  function addLabelFilter (key, value) {
    const id = filterKey(key, value)
    if (labelFilters.value.some(f => filterKey(f.key, f.value) === id)) {
      return
    }
    labelFilters.value = [...labelFilters.value, { key, value }]
    filterEditMode.value = false
  }

  function removeLabelFilter (key, value) {
    const id = filterKey(key, value)
    labelFilters.value = labelFilters.value.filter(f => filterKey(f.key, f.value) !== id)
  }

  function clearLabelFilters () {
    labelFilters.value = []
    filterEditMode.value = false
  }

  function submitFilterEdit (text) {
    labelFilters.value = parseFiltersFromText(text)
    filterEditMode.value = false
  }

  function renderLastUpdated (res) {
    const alertCount = res.Alerts ? Object.keys(res.Alerts).length : 0

    if (res.LastUpdated > 0) {
      const lastUpdatedDate = new Date(res.LastUpdated * 1000)
      const deltaLastUpdated = Math.floor((lastUpdatedDate - new Date()) / 1000)

      lastUpdatedStatus.value = {
        text: formatCompactAge(deltaLastUpdated),
        title: 'Last payload from AlertManager: ' + lastUpdatedDate.toLocaleString(),
        tone: deltaLastUpdated < -100 && alertCount > 0 ? 'critical' : (deltaLastUpdated > 0 ? 'info' : '')
      }
      return
    }

    if (res.LastUpdated === 0) {
      lastUpdatedStatus.value = {
        text: 'Nothing received from Alertmanager yet',
        title: '',
        tone: 'critical'
      }
    }
  }

  function fetchJson (path) {
    return window.fetch(window.location.origin + path, {
      headers: { Accept: 'application/json' }
    }).then(response => {
      if (!response.ok) {
        throw new Error(path + ' failed: ' + response.status)
      }
      return response.json()
    })
  }

  function updateSettings () {
    return fetchJson('/api/settings')
      .then(res => {
        offline.value = false
        settings.value = {
          ...res,
          IgnoredLabels: Array.isArray(res.IgnoredLabels) ? res.IgnoredLabels : []
        }
        severityWeighting.value = new Map(Object.entries(res.SeverityLabels || {}))
        settingsReady.value = true
        versionText.value = res.Version ? 'Version: ' + res.Version : ''
      })
      .catch(error => {
        console.error('Fetch error:', error)
        versionText.value = 'Error fetching version'
        if (isNetworkError(error)) {
          offline.value = true
        }
      })
  }

  function fetchAlertList () {
    return fetchJson('/api/alert_list')
      .then(res => {
        offline.value = false
        lastAlertResponse.value = res
        renderLastUpdated(res)
      })
      .catch(error => {
        console.error('Fetch error:', error)
        lastUpdatedStatus.value = { text: 'Fetch error', title: '', tone: 'critical' }
        if (isNetworkError(error)) {
          offline.value = true
        }
      })
  }

  function tick () {
    timeUntilNextUpdate.value -= 1
    if (timeUntilNextUpdate.value < 0) {
      fetchAlertList()
      timeUntilNextUpdate.value = REFRESH_SECONDS
    }
  }

  function onOnline () {
    offline.value = false
    timeUntilNextUpdate.value = 0
    fetchAlertList()
    updateSettings()
  }

  function onOffline () {
    offline.value = true
  }

  let intervalId

  onMounted(() => {
    intervalId = window.setInterval(tick, 1000)
    updateSettings()
    fetchAlertList()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
  })

  onUnmounted(() => {
    window.clearInterval(intervalId)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  })

  return reactive({
    alerts,
    drawLabels,
    filterEditMode,
    labelFilters,
    lastUpdatedStatus,
    offline,
    refreshProgress,
    refreshMax: REFRESH_SECONDS,
    timeUntilNextUpdate,
    versionText,
    addLabelFilter,
    clearLabelFilters,
    removeLabelFilter,
    submitFilterEdit,
    setDrawLabelsPreference
  })
}
