#!/usr/bin/env bash
# Seeds the throwaway receiver with fictional alerts via its public
# Alertmanager webhook. startsAt is computed from startsAgoMinutes so the
# "firing since" ages look the same on every run.
# Usage: seed.sh <backend-base-url>
set -euo pipefail

base="${1:?backend base url}"
here="$(cd "$(dirname "$0")" && pwd)"

jq -c --argjson now "$(date +%s)" '{
	alerts: map(. + {
		Status: "firing",
		StartsAt: ($now - .startsAgoMinutes * 60 | todate)
	} | del(.startsAgoMinutes))
}' "$here/seed/alerts.json" |
	curl -fsS -X POST -H 'Content-Type: application/json' --data-binary @- "$base/alerts" >/dev/null

count="$(curl -fsS "$base/api/alert_list" | jq '.Alerts | length')"
echo "Seeded $count alerts"
