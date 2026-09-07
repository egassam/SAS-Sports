# SAS Sports v2.3.2 — Cloudflare Worker deployment

SAS Sports is deployed as a Cloudflare Worker with Static Assets and an on-demand live athletics-data backend.

## Current version
- Worker/API version: `2.3.2`
- Worker entry point: `src/index.js`
- Static web UI: `public/index.html`
- School catalog: `src/schools.json`
- Cloudflare config: `wrangler.jsonc`

## Live endpoints
- `/api/status` — API/version status
- `/schools` — school catalog
- `/live/feed/grouped?school=kstate&sport=Volleyball` — grouped live/results/upcoming feed
- `/live/status?school=kstate&sport=Volleyball` — source/fetch status
- `/web` — web UI alias

## v2.3.2 fixes
- Uses official athletics schedule pages on demand.
- Prioritizes live/current results and upcoming events.
- Groups results and upcoming schedule by sport.
- Tracks whether a sport is currently in season.
- Improved final-score parsing for official schedule pages.
- Filters embedded neutral-site tournament matchups so unrelated games are not mislabeled as the selected school's events.
- No packaged/stale pilot result is substituted when a live request fails.

## Deployment
This repository is intended to deploy to Cloudflare from the `main` branch. If deploying manually with Wrangler:

1. Run `npm install`.
2. Run `npx wrangler login` and approve Cloudflare access.
3. Run `npm run deploy`.
4. Wrangler will print the live `https://<worker>.<subdomain>.workers.dev` address.

## Local test
- `npm install`
- `npm run check`
- `npm run dev`
- Open the local URL Wrangler prints.

## School certification
- Run `npm run test:schools` to certify Kansas State, Kansas, and Florida.
- Run `npm run test:school -- new-school-id` to apply the same checks to a newly added school.
- Optional filters: `--schools=kstate,kansas`, `--sports="Cross Country,Soccer"`, and `--base=https://preview.example.com`.

The certification checks the official feed domain, current-season events, final results, exactly three clickable roster athletes, and event-matched highlights. `PASS*` means the core checks passed but the newest final did not have a usable official recap.

## Important
Do not open `public/index.html` directly from Android or a desktop file browser. The Worker is the live backend and must be running for current data.
