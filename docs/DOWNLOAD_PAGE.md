# Download page and feedback

User, November 23, 2026: "We need to make a download page for this app with instructions on how it works and how you customize so I can start sharing it. I need to start getting more feedback." Version `4.329.0-get-page`.

**Link to share:** https://sas-sports.lovetogivepain.workers.dev/get/

## The page (`public/get/index.html`, a static asset)

- **Install it:** a button that opens the browser's own install prompt where there is one (Android, Chrome and Edge on a computer), and the steps for iPhone/iPad, Android and computer. The page opens on the visitor's own device's tab.
- **How it works:** levels, Home, team pages, how finals and Home/Away read, official sources, every sport.
- **Make it yours:** ☆ Favorite, the My Teams order, ⚙ Customize (Home and level pages), Alerts, Calendar.
- **Questions:** cost, why there's no app store listing, storage, missing teams, wrong scores, removing it.
- **Send feedback:** a form (Idea / Something's wrong / Missing team / What I like / Other, the message, an optional team and optional contact). `?team=` pre-fills the team.
- **Share it:** the native share sheet where the phone has one, and Copy link.
- The team counts are rounded down ("250+", "360+", "180+", "80+"), so new counties don't make them wrong.
- The app links to it from the footer ("Get the app, how it works and how to customize · Send feedback") and from a header **Feedback** link on screens wider than 600 px (on a phone, Alerts, Calendar and Install app already fill the header: the first try, showing it where Install app was hidden, made the reference page 420 px wide on the preview, where Alerts is on).

## Feedback (`src/feedback.mjs`, `POST /api/feedback`)

- Stored in D1 `CATALOG_DB`, table `feedback` (created on first use), per host: a preview's notes are its own.
- Limits: message 3 to 2,000 characters, body 8 KB, 60 notes an hour per host; a hidden field bots fill in drops the note; only the site's own page (same `Origin`) can send.
- **Reading the notes:**
  - Cloudflare dashboard → Storage & Databases → D1 → `sas-sports-catalog` → Console: `SELECT id,at,kind,message,team,contact,device FROM feedback WHERE scope='sas-sports.lovetogivepain.workers.dev' ORDER BY id DESC;`
  - Or `GET /api/feedback` with `Authorization: Bearer <SOURCE_FETCH_KEY>` (latest 500).
- Test: `tests/download-page.mjs` (in `npm test` and `test:release`).
