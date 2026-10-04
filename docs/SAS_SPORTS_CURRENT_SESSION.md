# SAS Sports — Current State and Next Session

Last updated: October 4, 2026, America/Chicago. Production `4.52.10-colorado-athletes`.

**Read this whole file at the start of every SAS Sports session.** Keep it short: it holds only what the next session needs. Full evidence and every earlier session record are in `docs/SAS_SPORTS_HISTORY.md` (append-only; search it, do not read it whole). Per-school detail and limitations are in `docs/<SCHOOL>_MODULE.md`.

## Baseline

| Item | Value |
| --- | --- |
| Repository / default branch | `egassam/SAS-Sports` / `main` |
| Production | https://sas-sports.lovetogivepain.workers.dev (`/api/status` → `4.52.10-colorado-athletes`) |
| Branch preview | `https://<branch>-sas-sports.lovetogivepain.workers.dev` |
| XC baselines (every gate) | K-State 18/20 (Gans Creek / Platte River), KU 26/21 (Gans Creek / Bob Timmons) |
| Recovery checkpoint | branch `checkpoint/kstate-xc-verified-20260926` (do not move) |

## Schools

| School | Module | State | Open items (detail in the module doc) |
| --- | --- | --- | --- |
| K-State | `src/schools/kstate.mjs` | Complete; the reference format | — |
| KU | `src/schools/kansas.mjs` | Complete | Tennis/softball/track source limits (`KANSAS_MODULE.md`) |
| Oklahoma State | `oklahoma-state.mjs` | Complete except source-blocked | Women's Basketball times (page 403); Tennis fills when okstate.com publishes |
| Utah | `utah.mjs` | Complete except source-blocked | Baseball and Women's Basketball times (utahutes.com 403) |
| Arizona State | `arizona-state.mjs` | All 17 sports converted | Athlete certification not reviewed (no `athlete_sports` in `tests/certified-schools.json`); golf field size; XC team scores |
| BYU | `byu.mjs` | All 12 sports converted | Athlete certification only partly listed; Gymnastics and Track & Field fill when published |
| UCF | `ucf.mjs` | Complete | Rowing, Track & Field, men's Tennis fill when published |
| Arizona | `arizona.mjs` | Complete except source-blocked | Baseball athletes when the 2027 roster lists players |
| Baylor | `baylor.mjs` | Complete | Track & Field, Acrobatics & Tumbling fill when published |
| Cincinnati | `cincinnati.mjs` | Complete | Tennis was added to the catalog (#212): user may want it reverted |
| Colorado | `colorado.mjs` | Complete | Track & Field fills when published; first live cards not yet observed |

**Remaining unconverted Big 12 schools:** Houston, Iowa State, TCU, Texas Tech, West Virginia, all SIDEARM sites (`__NUXT_DATA__` on their football pages; Houston, Iowa State, TCU and Texas Tech return 403 to the sandbox and come through the private source route). Start the one the user names. Houston's football page still goes through the shared `compactScheduleHtml`; check whether its module needs the whole page, as Colorado's did.

**PR #227 (registry + shared SIDEARM reader) is merged** (`1e6ba9d`, user: "Merge it") and verified in production; the next school starts from `main` with `npm run scaffold-school`.

## How to convert a school (fast path, October 4)

1. **Setup in one command:** `npm run scaffold-school -- --school=<id>` (dry run), then add `--write`. It writes `src/schools/<id>.mjs` with today's exact routes, combined sports and Instagram tags (route parity, checked by the script) and the shared SIDEARM reader with no sports enabled, moves those lines out of `src/index.js`, wires the module in (import, handlers, one `SCHOOL_MODULES` entry; #227), and creates `tests/<id>-module.mjs` in both suites. Test harnesses pick up new modules from `src/index.js` automatically (`tests/school-module-deps.mjs`). Tried on all five remaining schools in scratch copies: route parity on every sport; full release suite passed for Houston and Texas Tech. Texas Tech keeps its multi-line saved results in `src/index.js` (the script lists them).
2. Save the official pages as fixtures (`tests/fixtures/<id>-module/`). Sites that return 403 to the sandbox: `NODE_USE_ENV_PROXY=1 node scripts/fetch-official.mjs <url> tests/fixtures/<id>-module/<name>.html.gz --gzip`. **SIDEARM schools (all five remaining):** turn a sport on by adding it to the module's `pageDataSports`; the shared reader (`src/sidearm-schedule-reader.mjs`, #227) does the rest. Change a reader setting only where the site differs (opponent names, golf/meet results, merges, doubleheaders), copying from Colorado, Baylor or Arizona. Scratch test: Houston Football with no settings read the real page in K-State's format (5 finals with scores and recaps, 7 upcoming, published times). Other hooks (cross country, recap matcher, archive stories) go in the school's `SCHOOL_MODULES` entry; TFRRS: `src/tfrrs-results.mjs`. WMT sites (Cincinnati, UCF) have their own readers.
3. Build and test **one sport at a time locally** (`node tests/<school>-module.mjs`, with mutations that fail it).
4. **Publish in batches (user, October 4: "1 is a yes"):** a PR may carry several finished sports of the same school. Suggested: (a) setup + Football + the other live-score sports, (b) the remaining sports, (c) athlete certification + docs. Every sport in the PR gets the full gate.
5. Gate in one command per PR: `npm run verify:preview -- --branch=<branch> --school=<id> --sports="A,B,C"` (status, XC 18/20 and 26/21, 36 forced refreshes per sport, every final in K-State's form, every expanded view). Then look at each sport on the preview page. After merging: `npm run verify:prod -- --school=<id> --sports=all --version=<v>`.
6. Release suite: `npm run test:release` alone (since October 4 it runs everything `npm test` runs, plus `check` and isolation; about 2.5 minutes). While working, run only the school's module test.

## Working notes

- **User preference:** watch for the user's messages while working; stop or change course at once when they write.
- **Sandbox network:** Node's fetch needs `NODE_USE_ENV_PROXY=1` (the `verify:*` scripts set it). Playwright's Chromium needs `channel:'chromium'` and `--ignore-certificate-errors-spki-list=<sha256 of /root/.ccr/agent-proxy-ca.crt public key>`.
- **Private source route:** `/api/source` with `SOURCE_FETCH_KEY` / sandbox `SAS_SOURCE_KEY`. Never paste the key into chat. Never pose as a browser or route around bot defense otherwise.
- **Highlight store** (KV `sas-sports-highlights`, shared by preview and production, 30 days): opening an expanded view on a preview stores it. When a change rewrites verified finals, raise the school's `highlightRevision`.
- **Known transients:** the first K-State XC read right after a preview deploy has lacked its two meets (the verify script retries it three times); the first page load after a deploy can be the old page (edge cache); expanded views show `ai_failed` about 1 in 15 opens (the page asks once more).
- **Paused by the user:** global source cache via Durable Objects (needs Cloudflare "Worker Previews" first); scheduled feed refresh (#87/#88, reverted). Plans are in the history file.
- **Later, not now:** when high school or pro teams are added, order the level switch High School, College, Pro (`LEVELS` in `public/index.html`).
- **Waiting on TFRRS:** Baylor's Chile Pepper Festival (Oct 3) shows "Completed" without a result line or story until TFRRS publishes it; recheck with `npm run verify:prod -- --school=baylor --sports="Cross Country"`.
- **Live checks still to observe:** Colorado volleyball at Baylor (Oct 4) and soccer vs Baylor (Oct 8); Cincinnati volleyball at UCF (Oct 9) and soccer vs Utah (Oct 8); a basketball game going live (season from Oct 16).

## Session log

Newest last. One short entry per session here; the full record goes at the end of `docs/SAS_SPORTS_HISTORY.md`.

- **Oct 4 — Colorado, all sports** (#214–#224). Complete; production `4.52.10-colorado-athletes`, deep certification 9/9.
- **Oct 4 — Registry and shared SIDEARM reader** (PR #227, merged `1e6ba9d` on the user's "Merge it"; production verified). One `SCHOOL_MODULES` entry per school in `src/index.js`; Colorado, Baylor and Arizona on one reader (19,488 parses identical); preview: 133/133 converted feeds identical to production.
- **Oct 4 — Faster sessions and conversions** (PR #225, merged `abbccc0` on the user's "Merge"). Handoff split into this file + history; `AGENTS.md` updated for batched PRs and the shorter startup read; `scripts/verify-release.mjs` (`npm run verify:preview` / `verify:prod`); shared TFRRS reader `src/tfrrs-results.mjs`; `npm run scaffold-school`. Production verified with `verify:prod` (Colorado, Cincinnati, Baylor Cross Country; XC 18/20 and 26/21). The version was not bumped (no output change), so the new build cannot be told apart by `/api/status`. Baylor's Chile Pepper Festival has no result line yet: its TFRRS results are not published (same before and after).
