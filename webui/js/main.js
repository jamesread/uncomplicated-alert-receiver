'use strict'

const severityWeighting = new Map([
  ['critical', 1],
  ['severe', 2],
  ['warning', 3],
  ['important', 4],
  ['info', 5]
])

export default function main () {
  window.timeUntilNextUpdate = 0

  setInterval(updateProgressBar, 1000)
}

function updateProgressBar () {
  const progressBar = document.getElementById('next-update')

  progressBar.value = 30 - window.timeUntilNextUpdate

  window.timeUntilNextUpdate--

  if (timeUntilNextUpdate < 0) {
    fetchAlertList()
    window.timeUntilNextUpdate = 30
  }
}

function fetchAlertList () {
  const alertList = document.getElementById('alert-list')
  alertList.innerHTML = ''

  fetch('/alert_list')
    .then(response => response.json())
    .then(res => {
      const alerts = res.Alerts

      for (const alert of Object.keys(alerts)) {
        alertList.appendChild(renderAlert(alerts[alert]))
      }

      renderLastUpdated(res)
    })
}

function renderLastUpdated (res) {
  if (res.LastUpdated > 0) {
    const lastUpdatedDate = new Date(res.LastUpdated * 1000)
    const deltaLastUpdated = Math.floor((lastUpdatedDate - new Date()) / 1000)
    const formatter = new Intl.RelativeTimeFormat()

    document.getElementById('last-updated').textContent = formatter.format(deltaLastUpdated, 'seconds')
    document.getElementById('last-updated').title = lastUpdatedDate.toLocaleString()

    if (deltaLastUpdated < -100) {
      document.getElementById('last-updated').classList.add('critical')

    } else if (deltaLastUpdated > 0) {
      document.getElementById('last-updated').classList.add('info')
    } else {
      document.getElementById('last-updated').classList.remove('critical')
    }
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
      alertElement.style.order = severityWeighting.get(alert.Labels.severity)
    } else {
      alertElement.style.order = '10'
    }

    alertElement.classList.add(alert.Labels.severity)
  } else {
    alertElement.style.order = '10'
  }

  return alertElement
}
