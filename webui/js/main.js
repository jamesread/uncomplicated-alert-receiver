'use strict'

export default function main () {
  fetchAlertList()
  setInterval(fetchAlertList, 30000)
}

function clearAlertList (clazz) {
  let alertList = document.getElementById(clazz)

  alertList.innerHTML = ''

  return alertList
}

function fetchAlertList () {
  clearAlertList('default')
  clearAlertList('critical')
  clearAlertList('info')
  clearAlertList('warning')

  const defaultAlertList = document.getElementById('default')

  fetch('/alert_list')
    .then(response => response.json())
    .then(res => {
      const alerts = res.Alerts

      for (const alert of Object.keys(alerts)) {
        let alertList = document.getElementById(alerts[alert].Labels.severity)

        if (alertList === null) {
          alertList = defaultAlertList
        }

        alertList.appendChild(renderAlert(alerts[alert]))
      }

      updateLastUpdated(res)
    })
}

function updateLastUpdated (res) {
  if (res.LastUpdated > 0) {
    const lastUpdatedDate = new Date(res.LastUpdated * 1000)
    const deltaLastUpdated = lastUpdatedDate - new Date()
    const formatter = new Intl.RelativeTimeFormat()

    document.getElementById('last-updated').textContent = formatter.format(Math.floor(deltaLastUpdated / 1000), 'seconds')
    document.getElementById('last-updated').title = lastUpdatedDate.toLocaleString()
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

  alertElement.classList.add(alert.Labels.severity)

  return alertElement
}
