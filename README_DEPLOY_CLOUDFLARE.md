# SAS Sports v2.3 — Cloudflare Worker deployment

This package is converted from the SAS Sports v2.2 Web Live build for Cloudflare Workers + Static Assets.

## What changed
- The Python/FastAPI live web endpoints were ported to a Cloudflare Worker.
- The existing SAS Sports web UI remains in `public/index.html`.
- `/schools`, `/live/feed/grouped`, `/live/status`, and `/api/status` run on the same origin as the UI.
- Official athletics schedule pages are fetched on demand by the Worker.
- No packaged pilot result is substituted when a live request fails.

## Easiest deployment
1. Create a free Cloudflare account if you do not already have one.
2. On a computer with Node.js installed, unzip this folder.
3. Open a terminal in the folder.
4. Run `npm install`.
5. Run `npx wrangler login` and approve Cloudflare access in the browser.
6. Run `npm run deploy`.
7. Wrangler will print the live `https://sas-sports.<your-subdomain>.workers.dev` address.
8. Open that HTTPS address in Chrome on your phone and bookmark it.

## Local test
- `npm install`
- `npm run dev`
- Open the local URL Wrangler prints.

## Important
Do not open `public/index.html` directly from Android. The Worker is the live backend and must be running for current data.

Cloudflare configuration is in `wrangler.jsonc`. The Worker entry point is `src/index.js`.
