## Setup Alertmanager

You should already have a prometheus running, as well as an alertmanager running, with at least one alert configured.

Simply, edit your alertmanager.yml to add UAR as a webhook_config. Here is an example, assuming UAR is running at yourServer:8080;

```yaml
receivers:
  - name: uar
    webhook_configs:
      - url: http://yourServer:8080/alerts
        send_resolved: true

route:
  receiver: uar
  repeat_interval: 30s
  group_interval: 30s
```

Of course you are free to set the sending intervals to a duration that fits you.

`send_resolved: true` is required so Alertmanager tells UAR when alerts clear and they can be removed from the board. UAR merges webhook notifications by alert fingerprint, so Alertmanager `group_by` routes work — each group updates or removes only its own alerts instead of replacing the whole board. Alertmanager only pushes when something changes (or on `repeat_interval` while alerts are still firing) — it does not send idle heartbeats when nothing is firing. UAR only treats a stale “Last result” as a warning while alerts are currently shown.

### Optional webhook authentication

If you set `WEBHOOK_TOKEN` on UAR, configure Alertmanager to send the same Bearer token:

```yaml
receivers:
  - name: uar
    webhook_configs:
      - url: http://yourServer:8080/alerts
        send_resolved: true
        http_config:
          authorization:
            type: Bearer
            credentials: <same-as-WEBHOOK_TOKEN>
```

Without `WEBHOOK_TOKEN`, `/alerts` accepts unauthenticated POSTs. The UI and read APIs remain open either way — keep UAR reachable only from trusted networks (Alertmanager and your NOC viewers).

## Next steps

UAR is very easy to understand and use, but for the next steps, you can check out the following;

* [User Guide](userguide.md)
* [Configuration](configuration.md)
