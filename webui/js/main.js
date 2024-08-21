'use strict'

export default function main () {
  fetchAlertList()
  setInterval(fetchAlertList, 30000)
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

      if (res.LastUpdated > 0) {
        const lastUpdatedDate = new Date(res.LastUpdated * 1000)
        const deltaLastUpdated = lastUpdatedDate - new Date()
        const formatter = new Intl.RelativeTimeFormat()

        document.getElementById('last-updated').textContent = formatter.format(Math.floor(deltaLastUpdated / 1000), 'seconds')
        document.getElementById('last-updated').title = lastUpdatedDate.toLocaleString()
      }
    })
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
    switch (alert.Labels.severity) {
      case 'critical':
        alertElement.style.order = '1'
        break
      case 'warning':
        alertElement.style.order = '2'
        break
      case 'info':
        alertElement.style.order = '3'
        break
      default:
        alertElement.style.order = '5'
    }

    alertElement.classList.add(alert.Labels.severity)
  } else {
    alertElement.style.order = '10'
  }

  return alertElement
}
