# SAS Sports installable app (PWA)

Started November 9, 2026 (user: "When should we make this into an app for Apple and Droid?", then "Begin the pwa"). Version `4.291.0-pwa`.

## What it is

The site can be installed from the browser and opens full screen with its own icon. No app store is involved; every deploy of the Worker updates the installed app.

- **Android / Chrome / Edge (desktop too):** an "Install app" button appears in the header when the browser offers installation (`beforeinstallprompt`). The browser menu's "Install app" also works.
- **iPhone / iPad:** the "Install app" button shows a hint: Share, then Add to Home Screen (Apple offers no install prompt to web pages).
- The button never shows inside the installed app.

## Files

| File | Purpose |
|---|---|
| `public/manifest.webmanifest` | Name, colors, `start_url` `/`, `display: standalone`, icons |
| `public/icons/*.png` | 192 and 512 icons ("any", rounded tile; "maskable", full bleed), 180 Apple touch icon. Drawn from the site's "SAS" mark by `scripts/make-pwa-icons.cjs` |
| `public/sw.js` | Service worker. Pages: network first (navigation preload), the offline page when there is no connection. Icons: from the device. **Everything else goes to the network untouched**: it never caches `/api/*`, `/live/*`, feeds or scores, so the shared feed caching and `refresh=1` behave exactly as before |
| `public/offline.html` | "You're offline" page; reloads when the connection returns |
| `public/index.html` | Manifest, icon and Apple meta tags; the Install button and hint; registers `/sw.js` |
| `tests/pwa.mjs` | Checks the tags, the manifest and icon sizes, and runs `sw.js` to prove score/feed requests are left to the network (in `npm test` and `test:release`) |

These files are served as static assets (not in `run_worker_first`), so the Worker's code is not involved.

To change the service worker's cached files, bump `CACHE` in `sw.js` (`sas-sports-shell-v1`); old caches are deleted on activation.

## Not built yet (next steps toward store apps)

- **Push alerts** for favorites' live scores and finals (Web Push; on iPhone it works only for the installed app, iOS 16.4+). This is also what Apple needs to see before it accepts a wrapped app.
- One "home" request for every favorite's saved feed (already open in the handoff), before an app makes Home load more often.
- App store builds (Capacitor around the same site): Apple Developer Program $99/year, Google Play $25 once, and a Mac or cloud build service for iOS. Logo and trademark use to settle before store review.
