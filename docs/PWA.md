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
| `public/sw.js` | Service worker. Pages: network first (navigation preload), the offline page (`/offline`; Cloudflare redirects `/offline.html` there, and a redirected answer cannot stand in for a page) when there is no connection. Icons: from the device. **Everything else goes to the network untouched**: it never caches `/api/*`, `/live/*`, feeds or scores, so the shared feed caching and `refresh=1` behave exactly as before |
| `public/offline.html` | "You're offline" page; reloads when the connection returns |
| `public/index.html` | Manifest, icon and Apple meta tags; the Install button and hint; registers `/sw.js` |
| `tests/pwa.mjs` | Checks the tags, the manifest and icon sizes, and runs `sw.js` to prove score/feed requests are left to the network (in `npm test` and `test:release`) |

These files are served as static assets (not in `run_worker_first`), so the Worker's code is not involved.

To change the service worker's cached files, bump `CACHE` in `sw.js` (`sas-sports-shell-v1`); old caches are deleted on activation.

## Push alerts (user, November 8, 2026: "Let's do push alerts next")

Version `4.292.0-push-alerts`. An **Alerts** button in the header (shown only when alerts are set up) turns on alerts for the phone's favorites (☆ Favorite): one alert when a favorite's game **starts**, one with its **final score**. Tapping an alert opens that team's page. The panel has "Send a test alert" and "Turn off alerts".

- **Covered:** college and pro teams (the ESPN live boards Home already reads). **Not yet:** middle and high schools (their live source, MaxPreps, refuses frequent reads).
- **iPhone/iPad:** only in the installed app (iOS 16.4+). In Safari the button explains how to install first.
- **Favorites follow the phone:** the page sends the favorites again on every load and whenever a star changes.

How it runs:

| Piece | Where |
|---|---|
| Encryption (RFC 8291 aes128gcm), VAPID signing (RFC 8292), which alerts are due, the message text | `src/push-alerts.mjs` (WebCrypto only, no library) |
| `GET /api/push/config`, `POST /api/push/subscribe` (subscription and favorites), `/unsubscribe`, `/test` (one every 30 s), `/run` (source key; runs the alert check now, for previews) | `pushRoute` in `src/index.js` |
| The check, every 2 minutes (Cron Trigger `*/2 * * * *`; the feed refresh keeps `*/10`) | `runPushAlerts` in `src/index.js` |
| Showing the alert and opening the team's page | `push` and `notificationclick` in `public/sw.js` |
| Tests | `tests/push-alerts.mjs`: the encryption against a vector made by `http_ece` (`tests/fixtures/push-vector.json`), the VAPID signature, the rules, and the whole Worker run on ESPN's Nov 8 NBA board (76ers at Bulls: start, no repeat, final with the score, 410 deletes, scopes) |

Rules: a run reads only the boards its subscribers' favorites play on (no subscriptions: no reads). A game is recorded the first time it is seen (D1 `push_events`, kept 3 days) and alerted at most once live and once final; a final never seen live (a game already over when alerts were turned on, a postponed game) is silent. Each run sends at most 40 messages. A subscription the phone's push service drops (404/410), or that fails 5 times in a row, is deleted. Subscriptions and events are kept per host (D1 `CATALOG_DB`, `push_subscriptions`), so a preview's are its own; only production has the Cron Trigger.

**Setup (once):** the Worker secret `VAPID_PRIVATE_KEY` (Cloudflare dashboard → Workers & Pages → sas-sports → Settings → Variables and Secrets → Add → type Secret). Its public half is `PUSH_PUBLIC_KEY` in `src/index.js` (a `VAPID_PUBLIC_KEY` variable overrides it). Without the secret, `/api/push/config` reports `enabled: false`, the button stays hidden and the 2-minute run does nothing. Changing the key pair turns off every phone's alerts until it turns them on again.

## Not built yet (next steps toward store apps)

- Middle and high school alerts (needs a source that can be checked every few minutes: SAS Scorer games, or spaced MaxPreps reads).
- Score-change alerts (every score, or close games late) if wanted; game-day reminders.
- One "home" request for every favorite's saved feed (already open in the handoff), before an app makes Home load more often.
- App store builds (Capacitor around the same site): Apple Developer Program $99/year, Google Play $25 once, and a Mac or cloud build service for iOS. Logo and trademark use to settle before store review.

**Confirmed on real games (November 13, 2026).** User: "I have received all notifications for my favorites": the start and final-score alerts for favorites' games arrive on the user's phone (earlier only the test alert had been seen).
