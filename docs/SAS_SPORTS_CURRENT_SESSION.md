# SAS Sports — Current State and Next Session

Last updated: October 7, 2026, America/Chicago. Production `4.53.0-houston`.

**Read this whole file at the start of every SAS Sports session.** Keep it short: it holds only what the next session needs. Full evidence and every earlier session record are in `docs/SAS_SPORTS_HISTORY.md` (append-only; search it, do not read it whole). Per-school detail and limitations are in `docs/<SCHOOL>_MODULE.md`.

## Baseline

| Item | Value |
| --- | --- |
| Repository / default branch | `egassam/SAS-Sports` / `main` |
| Production | https://sas-sports.lovetogivepain.workers.dev (`/api/status` → `4.53.0-houston`) |
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
| Houston | `houston.mjs` | Complete (first school on the shared kit) | Track & Field fills when published; Rice Invite (tennis) has no story; first live cards not yet observed |

**Remaining unconverted Big 12 schools:** Iowa State, TCU, Texas Tech, West Virginia, all SIDEARM sites (`__NUXT_DATA__`; Iowa State, TCU and Texas Tech return 403 to the sandbox and come through the private source route, which the fixture script uses on its own). Start the one the user names. Iowa State was tried in a scratch copy with the new scaffold: Football and Volleyball read in K-State's format with no setting changed; its men's golf schedule is `/sports/golf/` (`/sports/mens-golf/` is the empty template) and its Big 12 Football Championship (type P, no opponent) reads `vs Big 12 Football Championship` (fix in its session).

## How to convert a school (fast path, October 7)

Houston took **49 minutes** from start to production verified for 11 sports (14:17-15:06 UTC; Colorado: about 2.5 h for 9). With the steps below the next school should be faster still (fixtures, setup and the reader are now one command each):
1. **Setup:** `npm run scaffold-school -- --school=<id> --write`. Writes the module with **Houston's settings and every hook wired** (shared kit `src/sidearm-school-kit.mjs`: published times incl. `Noon`, golf rounds and match play, meet days, bracket rounds, team places with points, recap matcher, archive stories, TFRRS cross country, doubleheaders), each hook applying only to sports in `pageDataSports`, so output is unchanged until a sport is turned on (route parity checked). Live scoreboards come as ready lines in a comment. The test file comes with Houston's helpers (`parse`, `line`, `ownRecapsOnly`, `live`).
2. **Fixtures in one command:** `NODE_USE_ENV_PROXY=1 node scripts/fetch-school-fixtures.mjs --school=<id> [--tfrrs-f=<url> --tfrrs-m=<url>]` saves every schedule candidate, every current-season final's story, `/archives` where a scored final has no story, ESPN payloads and TFRRS pages, and prints which routes are SIDEARM's empty template or the homepage (drop them). About 20 s per three sports.
3. **Read it:** add the sports to `pageDataSports`, then `node scripts/survey-school.mjs --school=<id> [--sport=X] [--date=YYYY-MM-DD] [--raw]` prints each event in K-State's wording (`--raw` prints the page data). Fix only what differs; copy the test block from `tests/houston-module.mjs`; mutate each new rule.
4. **Publish** (user, October 4: batched): one PR can carry all sports of the school plus athletes (`tests/certified-schools.json`, `node tests/validate-schools.mjs <id> --athletes-only --base=<preview> --sports=...`) and docs. Gate: `npm run test:release` (about 3.5 min), `npm run verify:preview -- --branch=<branch> --school=<id> --sports="..."` (about 6.5 min for 11 sports; run it in the background), the page by eye (Playwright screenshot of each sport), then `verify:prod`.
## Working notes

- **User preference:** watch for the user's messages while working; stop or change course at once when they write.
- **Sandbox network:** Node's fetch needs `NODE_USE_ENV_PROXY=1` (the `verify:*` scripts set it). Playwright's Chromium needs `channel:'chromium'` and `--ignore-certificate-errors-spki-list=<sha256 of /root/.ccr/agent-proxy-ca.crt public key>`.
- **Private source route:** `/api/source` with `SOURCE_FETCH_KEY` / sandbox `SAS_SOURCE_KEY`. Never paste the key into chat. Never pose as a browser or route around bot defense otherwise.
- **Highlight store** (KV `sas-sports-highlights`, shared by preview and production, 30 days): opening an expanded view on a preview stores it. When a change rewrites verified finals, raise the school's `highlightRevision`.
- **Known transients:** the first K-State XC read right after a preview deploy has lacked its two meets (the verify script retries it three times); the first page load after a deploy can be the old page (edge cache); expanded views show `ai_failed` about 1 in 15 opens (the page asks once more).
- **Paused by the user:** global source cache via Durable Objects (needs Cloudflare "Worker Previews" first); scheduled feed refresh (#87/#88, reverted). Plans are in the history file.
- **Later, not now:** when high school or pro teams are added, order the level switch High School, College, Pro (`LEVELS` in `public/index.html`).
- **Waiting on TFRRS:** Baylor's Chile Pepper Festival (Oct 3) shows "Completed" without a result line or story until TFRRS publishes it; recheck with `npm run verify:prod -- --school=baylor --sports="Cross Country"`.
- **Live checks still to observe:** Colorado soccer vs Baylor (Oct 8); Cincinnati volleyball at UCF (Oct 9) and soccer vs Utah (Oct 8); Houston volleyball vs BYU (Oct 8) and football at Kansas State (Oct 10); a basketball game going live (season from Oct 15).

## Session log

Newest last. One short entry per session here; the full record goes at the end of `docs/SAS_SPORTS_HISTORY.md`.

- **Oct 4 — Colorado, all sports** (#214–#224). Complete; production `4.52.10-colorado-athletes`, deep certification 9/9.
- **Oct 4 — Registry and shared SIDEARM reader** (PR #227, merged `1e6ba9d` on the user's "Merge it"; production verified). One `SCHOOL_MODULES` entry per school in `src/index.js`; Colorado, Baylor and Arizona on one reader (19,488 parses identical); preview: 133/133 converted feeds identical to production.
- **Oct 4 — Faster sessions and conversions** (PR #225, merged `abbccc0` on the user's "Merge"). Handoff split into this file + history; `AGENTS.md` updated for batched PRs and the shorter startup read; `scripts/verify-release.mjs` (`npm run verify:preview` / `verify:prod`); shared TFRRS reader `src/tfrrs-results.mjs`; `npm run scaffold-school`. Production verified with `verify:prod` (Colorado, Cincinnati, Baylor Cross Country; XC 18/20 and 26/21). The version was not bumped (no output change), so the new build cannot be told apart by `/api/status`. Baylor's Chile Pepper Festival has no result line yet: its TFRRS results are not published (same before and after).
- **Oct 7 — Houston, all 11 sports + faster conversions** (PR #229, merged `ecbaef3`; production `4.53.0-houston` verified, athletes 11/11). 49 minutes start to production. Shared kit `src/sidearm-school-kit.mjs`; `scripts/fetch-school-fixtures.mjs`, `scripts/survey-school.mjs`; scaffold writes Houston's settings with every hook wired.
