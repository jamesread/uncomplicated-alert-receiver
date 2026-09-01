# Configuration

UAR is designed so that it very much works "out of the box" and with zero configuration. However, it's entirely possible that people might want to tweak things, so there are some configuration options provided.

## Configuration options

### `ALERTMANAGER_HOST` Environment Variable

This is the browser URL to get to alertmanager. If you set this, alert links will be clickable. eg: `https://am.webapps.example.com`.

### `WEBHOOK_TOKEN` Environment Variable

Optional shared secret for `POST /alerts`. When set, Alertmanager (or any client) must send `Authorization: Bearer <token>`. When unset, the webhook stays open — keep UAR on a trusted network in that case.

The UI and `/api/*` read endpoints stay unauthenticated on purpose; place them behind your network perimeter (VPN, reverse proxy allowlist, etc.).

### `CORS_ORIGIN` Environment Variable

Controls the `Access-Control-Allow-Origin` header on `/api/settings` and `/api/alert_list`.

* Unset or empty (default): no CORS header (same-origin UI works as usual).
* A concrete origin (eg. `https://noc.example.com`): that origin is allowed.
* `*`: restore the previous open CORS behaviour if you need it.

### `SEV_LABELS_...` Environment Variables

The default severity labels are;

* `SEV_LABELS_1`: crit,critical
* `SEV_LABELS_2`: severe
* `SEV_LABELS_3`: warning
* `SEV_LABELS_4`: important
* `SEV_LABELS_5`: info,information

### `DRAW_LABELS` Environment Variable

When set to any non-empty value, UAR will show Prometheus labels on each alert box by default. You can also toggle label display from the logo menu in the UI; that preference is stored in the browser.

### `IGNORED_LABELS` Environment Variable

A comma-separated list of label names that should not be drawn when labels are shown. The default is `alertname,instance,job,severity`.

### `DEMO` Environment Variable

When set to any non-empty value, UAR injects a built-in sample alert payload on startup and again every 3 minutes. Use this for local UI work or demos so you do not need to POST webhook fixtures. Do not enable it on a production receiver that should only show real Alertmanager data.

## Built-in limits

Webhook requests are capped to protect memory:

* Request body: **1 MiB** maximum (larger payloads return `413`).
* Stored alerts: **1000** maximum distinct alerts. Updates and resolves for existing alerts still work at capacity; inserting a new alert when full returns `503` so Alertmanager can retry.
