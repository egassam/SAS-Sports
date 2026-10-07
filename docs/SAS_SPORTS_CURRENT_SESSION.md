# SAS Sports — Current State and Next Session

Last updated: October 7, 2026, America/Chicago. Production `4.54.0-iowa-state`.

**Read this whole file at the start of every SAS Sports session.** Keep it short: it holds only what the next session needs. Full evidence and every earlier session record are in `docs/SAS_SPORTS_HISTORY.md` (append-only; search it, do not read it whole). Per-school detail and limitations are in `docs/<SCHOOL>_MODULE.md`.

## Baseline

| Item | Value |
| --- | --- |
| Repository / default branch | `egassam/SAS-Sports` / `main` |
| Production | https://sas-sports.lovetogivepain.workers.dev (`/api/status` → `4.54.0-iowa-state`) |
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
| Iowa State | `iowa-state.mjs` | 12 sports converted; athletes open | Three-Instagram rule: Cross Country 2, Tennis 0, Swimming & Diving 0 (no further links on roster cards or 24 profile pages); Track & Field and Gymnastics fill when published; first live cards not yet observed |

**Remaining unconverted Big 12 schools:** TCU, Texas Tech, West Virginia, all SIDEARM sites (`__NUXT_DATA__`; TCU and Texas Tech return 403 to the sandbox and come through the private source route, which the fixture scripts use on their own). Start the one the user names. TCU was scaffolded in a scratch copy on Oct 7: route parity 14/14, its test passes.

## How to convert a school (fast path, October 7)

Iowa State took **29 minutes** from start to production verified for 12 sports (15:51-16:20 UTC; Houston 49 min for 11, Colorado about 2.5 h for 9). Do the steps in this order; start each slow step in the background and work on while it runs:
1. **Setup (1 min):** `npm run scaffold-school -- --school=<id> --write`. Writes the module with Houston's and Iowa State's settings and every hook wired (shared kit `src/sidearm-school-kit.mjs`: published times, golf rounds and match play, meet days, bracket rounds, open championships, neutral multi-day events, conference tournaments, `(Ex.)` labels, team places with points, recap matcher, archive stories, TFRRS cross country, doubleheaders), each applying only to sports in `pageDataSports`. Adds the test file with helpers and `npm run test:<id>-module`. Then fix the BYU-style "other schools are unchanged" tests if they name this school (BYU's named Iowa State; now TCU).
2. **Fixtures (1 min):** `NODE_USE_ENV_PROXY=1 node scripts/fetch-school-fixtures.mjs --school=<id> --tfrrs-f=<url> --tfrrs-m=<url>` (TFRRS team pages are `https://www.tfrrs.org/teams/xc/<ST>_college_<f|m>_<Name>.html`; check with curl). Saves every schedule candidate, stories, `/archives` and the archive stories of past meets/tournaments the schedule links no story for, ESPN payloads, TFRRS pages. Drop the routes it flags (empty template, homepage); set `combinedSports` and `teamLabels` (a men's page with no `mens-` in its address).
3. **Read it (10 min):** turn every sport on in `pageDataSports`, then `node scripts/survey-school.mjs --school=<id>`. It prints each event in K-State's wording and flags **GATE** on any final with neither result line nor story (the gate fails those; fix them first, usually with `meetSports` and the archive). `--raw` prints page data; `--lines` prints test-ready arrays. Write one test block per sport from `--lines` (see `tests/iowa-state-module.mjs`); mutate each new rule.
4. **Publish:** commit, push, open the PR; the preview is up within a minute. In parallel: `npm run test:release` (3 min), `npm run verify:preview -- --branch=<branch> --school=<id> --sports=all` (5-6.5 min, background), athletes **at once** (`node tests/validate-schools.mjs <id> --athletes-only --base=<preview>`: tennis/swimming rosters often publish no Instagram → `athlete_profile_fallback_sports`; cross country may have only 2 → minimum 2, as KU and Oklahoma State), and `npm run screenshot-school -- --school=<id> --branch=<branch>` (every sport's page, 390px, school time zone). Merge when all pass, then `verify:prod` and the athletes check on production.

## Three Instagram athletes per sport (user rule, October 7)

User: "I keep seeing only two athletes with Instagram accounts in different sports. I want three!" Rule recorded in `AGENTS.md` (item 5a). The app no longer stops at two roster-card links: it reads up to 24 athletes' profile pages for a third (`ATHLETE_PROFILE_BUDGET`, `src/index.js`; PR #232). Preview sweep (`4.54.1-three-athletes`, 109 certified school-sports) still short, because the official sites publish no further links: Alabama Soccer 0; Colorado Golf 0, Skiing 2; Iowa State Cross Country 2, Swimming & Diving 0, Tennis 0; Oklahoma State Cross Country 2, Equestrian 0, Tennis 1, Track & Field 0; Utah Volleyball 1. The remaining verified source is athletes tagged by the official team Instagram account (`verifiedInstagrams` in each module), and Instagram requires a login from the sandbox, so those need the user (handles from the team accounts) or a decision.

## Season records (user requests, October 7)

User: "put the sports overall win/loss record for every sport", then "add the conference record too". Each sport's header reads `Record 3-2 · Big 12 1-1` (one record per team for a combined sport: `Men's 5-2-3 · Women's 6-3-1 (Big 12 1-2-1)`). The Worker counts both from the current season's finals (`seasonRecords` in `src/index.js`; `records[].conference` on `/live/feed/grouped`):
- **Overall:** finals whose result line starts W/L/T; exhibitions and scrimmages out (labeled, or type `S` in SIDEARM page data), summer tours (basketball outside Nov-Apr) and fall ball (baseball, softball outside Feb-Jun) out; meets (places) have none.
- **Conference:** `src/conference-games.mjs`. Games the school's own SIDEARM page data marks `conference: true` (9 schools incl. K-State, ASU, Oklahoma State, Utah); otherwise (KU, BYU, UCF, Cincinnati) regular-season games against conference members.
- **Checked:** equal to the published records on the official pages for 14 school-sports (Iowa State ×4 and Oklahoma State soccer and K-State volleyball in tests; K-State football and soccer, Colorado, Baylor, Houston, Arizona, Utah on the preview); the fallback's football conference records equal ESPN's Big 12 standings (BYU 2-0, Cincinnati 1-1, UCF 1-1, KU 0-1).
- **Limits:** a team in another conference for its sport (UCF men's soccer) shows no conference record under the fallback; the fallback cannot tell a non-conference game against a member (rare) or a conference-tournament game not named as one.

## Working notes

- **User preference:** watch for the user's messages while working; stop or change course at once when they write.
- **Sandbox network:** Node's fetch needs `NODE_USE_ENV_PROXY=1` (the `verify:*` scripts set it). Playwright's Chromium needs `channel:'chromium'` and `--ignore-certificate-errors-spki-list=<sha256 of /root/.ccr/agent-proxy-ca.crt public key>`.
- **Private source route:** `/api/source` with `SOURCE_FETCH_KEY` / sandbox `SAS_SOURCE_KEY`. Never paste the key into chat. Never pose as a browser or route around bot defense otherwise.
- **Highlight store** (KV `sas-sports-highlights`, shared by preview and production, 30 days): opening an expanded view on a preview stores it. When a change rewrites verified finals, raise the school's `highlightRevision`.
- **Known transients:** the first K-State XC read right after a preview deploy has lacked its two meets (the verify script retries it three times); the first page load after a deploy can be the old page (edge cache); expanded views show `ai_failed` about 1 in 15 opens (the page asks once more).
- **Paused by the user:** global source cache via Durable Objects (needs Cloudflare "Worker Previews" first); scheduled feed refresh (#87/#88, reverted). Plans are in the history file.
- **Later, not now:** when high school or pro teams are added, order the level switch High School, College, Pro (`LEVELS` in `public/index.html`).
- **Waiting on TFRRS:** Baylor's Chile Pepper Festival (Oct 3) shows "Completed" without a result line or story until TFRRS publishes it; recheck with `npm run verify:prod -- --school=baylor --sports="Cross Country"`.
- **Live checks still to observe:** Iowa State soccer at Arizona State (Oct 8), football at BYU and volleyball vs Kansas State (Oct 9); Colorado soccer vs Baylor (Oct 8); Cincinnati volleyball at UCF (Oct 9) and soccer vs Utah (Oct 8); Houston volleyball vs BYU (Oct 8) and football at Kansas State (Oct 10); a basketball game going live (season from Oct 15).

## Session log

Newest last. One short entry per session here; the full record goes at the end of `docs/SAS_SPORTS_HISTORY.md`.

- **Oct 4 — Colorado, all sports** (#214–#224). Complete; production `4.52.10-colorado-athletes`, deep certification 9/9.
- **Oct 4 — Registry and shared SIDEARM reader** (PR #227, merged `1e6ba9d` on the user's "Merge it"; production verified). One `SCHOOL_MODULES` entry per school in `src/index.js`; Colorado, Baylor and Arizona on one reader (19,488 parses identical); preview: 133/133 converted feeds identical to production.
- **Oct 4 — Faster sessions and conversions** (PR #225, merged `abbccc0` on the user's "Merge"). Handoff split into this file + history; `AGENTS.md` updated for batched PRs and the shorter startup read; `scripts/verify-release.mjs` (`npm run verify:preview` / `verify:prod`); shared TFRRS reader `src/tfrrs-results.mjs`; `npm run scaffold-school`. Production verified with `verify:prod` (Colorado, Cincinnati, Baylor Cross Country; XC 18/20 and 26/21). The version was not bumped (no output change), so the new build cannot be told apart by `/api/status`. Baylor's Chile Pepper Festival has no result line yet: its TFRRS results are not published (same before and after).
- **Oct 7 — Houston, all 11 sports + faster conversions** (PR #229, merged `ecbaef3`; production `4.53.0-houston` verified, athletes 11/11). 49 minutes start to production. Shared kit `src/sidearm-school-kit.mjs`; `scripts/fetch-school-fixtures.mjs`, `scripts/survey-school.mjs`; scaffold writes Houston's settings with every hook wired.
- **Oct 7 — Iowa State, all 12 sports + faster conversions** (PR #231, merged `f7e2c68`; production `4.54.0-iowa-state` verified, athletes 12/12 under the old rule; 3 sports short under the new three-Instagram rule). 29 minutes start to production. Kit: archive stories for meets (`meetSports`), `teamLabels`; scaffold template gained four rules; `screenshot-school`, survey GATE flag and `--lines`, fixture script saves meet stories.
