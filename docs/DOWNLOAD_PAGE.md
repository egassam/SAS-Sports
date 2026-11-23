# Download page and feedback

User, November 23, 2026: "We need to make a download page for this app with instructions on how it works and how you customize so I can start sharing it. I need to start getting more feedback." Version `4.329.0-get-page`.

**Link to share:** https://sas-sports.lovetogivepain.workers.dev/get/

## The page (`public/get/index.html`, a static asset)

- **Install it:** a button (on iPhone, "How to install on iPhone", which scrolls to the steps) that opens the browser's own install prompt where there is one (Android, Chrome and Edge on a computer), and the steps for iPhone/iPad, Android and computer. The page opens on the visitor's own device's tab.
- **How it works:** levels, Home, team pages, how finals and Home/Away read, official sources, every sport.
- **Make it yours:** ☆ Favorite, the My Teams order, ⚙ Customize (Home and level pages), Alerts, Calendar.
- **Questions:** cost, why there's no app store listing, storage, missing teams, wrong scores, removing it.
- **Send feedback:** a form (Idea / Something's wrong / Missing team / What I like / Other, the message, an optional team and optional contact). `?team=` pre-fills the team.
- **Share it:** the native share sheet where the phone has one, and Copy link.
- The team counts are rounded down ("250+", "360+", "180+", "80+"), so new counties don't make them wrong.
- **Not linked from the app** (user, November 23: "I don't want it in the app. I only wanted an install page so I could send people to that page to install it."). Share the link directly. The app itself is unchanged.
- **Apple, in detail** (user: "Make sure it has detailed instructions for how to install it on Apple. Droid is easy"): Safari first; leaving the Instagram/Facebook/Snapchat/TikTok/X in-app browsers (named in a note when the page is opened inside one on an iPhone); where Share is (bottom toolbar, or ··· then Share on iOS 26 and the bottom address bar); scrolling the share sheet and Edit Actions when Add to Home Screen is missing; Open as Web App on; always opening from the icon; iPad; alerts (iOS 16.4+, Allow, the Settings fix after Don't Allow); Chrome on iPhone.

## Feedback (`src/feedback.mjs`, `POST /api/feedback`)

- Stored in D1 `CATALOG_DB`, table `feedback` (created on first use), per host: a preview's notes are its own.
- Limits: message 3 to 2,000 characters, body 8 KB, 60 notes an hour per host; a hidden field bots fill in drops the note; only the site's own page (same `Origin`) can send.
- **Reading the notes:**
  - Cloudflare dashboard → Storage & Databases → D1 → `sas-sports-catalog` → Console: `SELECT id,at,kind,message,team,contact,device FROM feedback WHERE scope='sas-sports.lovetogivepain.workers.dev' ORDER BY id DESC;`
  - Or `GET /api/feedback` with `Authorization: Bearer <SOURCE_FETCH_KEY>` (latest 500).
- Test: `tests/download-page.mjs` (in `npm test` and `test:release`).

## Feedback alerts on the owner's phone (`4.330.0-feedback-alerts`)

User, November 23, 2026: "I want to be notified when I get feedback." Each new note sends a push alert to the owner's phone(s): "New feedback · Missing team", with the team and the first 160 characters. Tapping it opens the app at `/?feedback=1`, which lists the latest 100 notes (kind, time, team, message, reply contact).

**Setup (once):**
1. Cloudflare dashboard → Workers & Pages → sas-sports → Settings → Variables and Secrets → Add → type **Secret**, name `OWNER_CODE`, value: a code you choose. (Without it, the source key `SOURCE_FETCH_KEY` works as the code.)
2. On the phone, in the **installed** app: turn on **Alerts**.
3. Tap the **SAS** logo at the top left **five times** quickly, enter the code. A "Feedback alerts are on" alert confirms it.

Afterwards, five taps on the logo open the notes. Turn off alerts on that phone to stop feedback alerts too.

**How it runs:** `push_owners` (D1, per host) lists the owner's subscriptions; `POST /api/push/owner {endpoint, code}` adds one (10 wrong codes an hour per host, then 429); `POST /api/push/feedback {endpoint}` returns the notes to an owner subscription only (403 otherwise); `notifyFeedbackOwners` in `src/index.js` sends the alert after the note is stored (a failed alert never loses the note). Text: `feedbackAlert` in `src/push-alerts.mjs`. Tests: `tests/push-alerts.mjs` (codes, the limit, the alert, the list, no owner no alert, unsubscribe ends it).

**Fix, `4.330.1-owner-taps`** (user: "Nothing happens when I tap on SAS logo"). The five-tap counter started only after the alerts set-up (the config read and `navigator.serviceWorker.ready`), which can stall on an iPhone; quick taps on the logo could also be taken as double-tap zoom; and the code was asked with `prompt()`, which iPhone home screen apps may not show. Now the taps are counted from the first moment the page runs (`pointerup` on the logo and the name beside it, `touch-action: manipulation`), the code is typed in a field in the panel, and a service worker that does not answer within 6 seconds gets a "turn on Alerts" answer instead of silence.

