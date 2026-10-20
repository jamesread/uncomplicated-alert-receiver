# Marketing screenshots

The PNGs in this directory are the README and docs screenshots. They are
captured from a throwaway UAR instance seeded with fictional alerts, so every
run produces the same images (only the "ago" times shift by a second or two).

## Requirements

- Go and Node.js (to build `service/uar` and run the Vite dev server)
- [`repo-helper`](https://github.com/jamesread/repo-helper) with Chromium and a matching `chromedriver`
- `curl` and `jq`

UAR keeps alerts in memory, so no database or other containers are needed.

## Regenerate

```bash
make                 # from this directory, or `make screenshots` from the repo root
```

This builds the service, starts it on `127.0.0.1:18480` and the frontend on
`127.0.0.1:18400`, posts `seed/alerts.json` to the `/alerts` webhook, captures
every section of `screenshots.ini`, writes `screenshot-manifest.yaml`, copies the
docs images to `docs/assets/marketing/`, and stops everything again.

To browse the seeded instance yourself: `make up seed`, open
<http://127.0.0.1:18400/>, then `make down`.

## Adding a screenshot

Add a section to `screenshots.ini` with `url`, `title` and `description` (and
`theme = dark` for dark variants, which go last), then run `make`.
`screenshot-manifest.yaml` is generated; don't edit it by hand.
