import { describe, expect, it } from 'vitest'
import { formatAlertForLlm } from './alertClipboard.js'

describe('formatAlertForLlm', () => {
  it('formats a full alert as markdown for an LLM', () => {
    expect(formatAlertForLlm({
      summary: 'Disk space > 90% on server1',
      labels: { severity: 'severe', job: 'disk-space', alertname: 'DiskSpaceHigh' },
      annotations: { summary: 'Disk space > 90% on server1', description: 'Almost full' },
      alertmanagerUrl: 'https://am.example/#/alerts'
    })).toBe(`# Prometheus alert

Disk space > 90% on server1

## Labels
- alertname: DiskSpaceHigh
- job: disk-space
- severity: severe

## Annotations
- description: Almost full
- summary: Disk space > 90% on server1

## Alertmanager
https://am.example/#/alerts
`)
  })

  it('omits empty maps and placeholder URLs', () => {
    expect(formatAlertForLlm({
      summary: 'Target down',
      labels: {},
      annotations: {},
      alertmanagerUrl: '#'
    })).toBe(`# Prometheus alert

Target down
`)
  })

  it('uses a placeholder when summary is missing', () => {
    expect(formatAlertForLlm({})).toBe(`# Prometheus alert

(no summary)
`)
  })
})
