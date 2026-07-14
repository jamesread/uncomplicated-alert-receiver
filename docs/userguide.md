# User Guide

When you have UAR installed, you will see a header that looks like this. The header has a couple of components;

## UI Introduction

![header](header.png)

- **Next Page Refresh** (Progress Bar): By default, UAR will refresh every 30 seconds. The process bar will show the time until the next refresh. It's useful to see this on heads up displays, as they can lock up, or get screen-freeze, and this progress bar proves the page has not frozen.

- **Last result**: This shows how long ago the last payload was received (for example `12s ago`, `53m ago`, `2h ago`, `3d ago`). This is useful to see if the payload is being received at all, or if your Alertmanager may be having issues. This will also show issues if there were errors talking to the UAR API.

- **Show labels**: Open the logo menu and choose **Show labels** to display Prometheus label key/value pairs on each alert box. Common labels such as `alertname`, `instance`, `job`, and `severity` are hidden by default. The choice is remembered in your browser.

- **Filter by label**: When labels are visible, click a label on an alert to add it to the filter bar below the header. Only alerts matching all active filters are shown. Click a filter again to remove it, or use **Clear**.

## Severity levels

UAR will render alerts according to their severity label, when available. The following severity levels are hard-coded, and ordered from highest to lowest;

- **Critical**: 1
- **Severe**: 2
- **Warning**: 3
- **Important**: 4
- **Info**: 5
