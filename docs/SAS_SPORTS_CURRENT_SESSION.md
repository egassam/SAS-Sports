# SAS Sports — Current State and Next Session

Last updated: October 7, 2026, America/Chicago. Production `4.59.0-west-virginia`.

**Read this whole file at the start of every SAS Sports session.** Keep it short: it holds only what the next session needs. Full evidence and every earlier session record are in `docs/SAS_SPORTS_HISTORY.md` (append-only; search it, do not read it whole). Per-school detail and limitations are in `docs/<SCHOOL>_MODULE.md`.

## Baseline

| Item | Value |
| --- | --- |
| Repository / default branch | `egassam/SAS-Sports` / `main` |
| Production | https://sas-sports.lovetogivepain.workers.dev (`/api/status` → `4.59.0-west-virginia`) |
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
| Iowa State | `iowa-state.mjs` | Complete (12 sports) | Track & Field and Gymnastics fill when published; Cross Country, Tennis, Swimming use profile cards (no further Instagram published); first live cards not yet observed |
| Texas Tech | `texas-tech.mjs` | Complete (10 sports) | Track & Field fills when texastech.com publishes 2026-27; first live cards not yet observed (soccer at Oklahoma State Oct 8, volleyball vs Baylor Oct 8) |
| West Virginia | `west-virginia.mjs` | Complete (14 sports) except source-blocked | Volleyball's James Madison exhibition (Aug 22) has no official story (archive checked), so deep is 13/14; golf shows place without field size (schedule publishes "8th Place"); Gymnastics, Rowing, Track & Field fill when published; first live cards not yet observed (soccer vs BYU Oct 8, volleyball at Utah Oct 8) |
| TCU | `tcu.mjs` | Complete (14 sports) | Triathlon's third athlete is a profile card (only 2 Instagram published); first live cards not yet observed (soccer vs UCF Oct 8, volleyball vs Arizona Oct 9) |

**All 16 Big 12 schools are converted** (West Virginia last, October 7). The BYU, Texas Tech and West Virginia "other schools" tests now name Illinois. Next: the user picks the next conference or the open items above.

## How to convert a school (fast path, October 7)

Texas Tech holds the total record: **26 minutes** from start to production for 10 sports (2.6 min per sport); West Virginia holds the per-sport record: **30 minutes** for 14 sports (20:44-21:14 UTC, 2.1 min per sport); Iowa State 29 for 12, TCU 41 for 14, Houston 49 for 11. What made Texas Tech fast: **start the module from the newest converted school's handlers (now West Virginia's), not the scaffold template** (its rules are a superset; copy everything from `const HOST=` down and rename), and generate the test blocks from `survey --lines` with a script. One preview round was lost to a volleyball final whose page links a preview story (run `validate-schools --deep` on the preview as soon as it is up, in parallel with `verify:preview`). Do the steps in this order; start each slow step in the background and work on while it runs:
1. **Setup (1 min):** `npm run scaffold-school -- --school=<id> --write`. Writes the module with Houston's and Iowa State's settings and every hook wired (shared kit `src/sidearm-school-kit.mjs`: published times, golf rounds and match play, meet days, bracket rounds, open championships, neutral multi-day events, conference tournaments, `(Ex.)` labels, team places with points, recap matcher, archive stories, TFRRS cross country, doubleheaders), each applying only to sports in `pageDataSports`. Adds the test file with helpers and `npm run test:<id>-module`. Then fix the BYU-style "other schools are unchanged" tests if they name this school (BYU's named Iowa State; now TCU).
2. **Fixtures (1 min):** `NODE_USE_ENV_PROXY=1 node scripts/fetch-school-fixtures.mjs --school=<id> --tfrrs-f=<url> --tfrrs-m=<url>` (TFRRS team pages are `https://www.tfrrs.org/teams/xc/<ST>_college_<f|m>_<Name>.html`; check with curl). Saves every schedule candidate, stories, `/archives` and the archive stories of past meets/tournaments the schedule links no story for, ESPN payloads, TFRRS pages. Drop the routes it flags (empty template, homepage); set `combinedSports` and `teamLabels` (a men's page with no `mens-` in its address).
3. **Read it (10 min):** turn every sport on in `pageDataSports`, then `node scripts/survey-school.mjs --school=<id>`. It prints each event in K-State's wording and flags **GATE** on any final with neither result line nor story (the gate fails those; fix them first, usually with `meetSports` and the archive). `--raw` prints page data; `--lines` prints test-ready arrays. Write one test block per sport from `--lines` (see `tests/iowa-state-module.mjs`); mutate each new rule.
   The survey now attaches the saved archive stories and TFRRS results as the Worker does, so a GATE is real. A home tournament named after the school, "Opponents TBD" bracket rounds, round-named postseason games, late tournament stories (`ownLinkDays`) and set-count volleyball stories (`volleyballSets`) are handled in Texas Tech's module; copy them forward.
4. **Publish:** commit, push, open the PR; the preview is up within a minute. In parallel: `npm run test:release` (3 min), `npm run verify:preview -- --branch=<branch> --school=<id> --sports=all` (5-6.5 min, background), athletes **at once** (`node tests/validate-schools.mjs <id> --athletes-only --base=<preview>`: tennis/swimming rosters often publish no Instagram → `athlete_profile_fallback_sports`; cross country may have only 2 → minimum 2, as KU and Oklahoma State), and `npm run screenshot-school -- --school=<id> --branch=<branch>` (every sport's page, 390px, school time zone). Merge when all pass, then `verify:prod` and the athletes check on production.

## Three featured athletes per sport (user rules, October 7)

"I want three!" then "Use official profile cards for those". Every sport shows three featured athletes: verified Instagram first (roster cards, then up to 24 profile pages, `ATHLETE_PROFILE_BUDGET`), then official roster-profile cards when the official sources publish no further link (`AGENTS.md` 5a). Production sweep (109 certified school-sports): all show three. Profile cards fill slots in 11, now listed in `athlete_profile_fallback_sports`: Alabama Soccer; Colorado Golf, Skiing; Iowa State Cross Country, Swimming & Diving, Tennis; Oklahoma State Cross Country, Equestrian, Tennis, Track & Field; Utah Volleyball. Every athlete minimum is 3 (Oklahoma State's were 1, KU's and Iowa State's cross country 2). `validate-schools --athletes-only` on production: Iowa State 12/12, Oklahoma State 11/11, Alabama 4/4, KU 4/4, Colorado 9/9, Utah 4/4.

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
- **Oct 7 — Three-Instagram rule, season and conference records** (PR #232 merged `478e8c9`, PR #233 merged `cfc62bd`, both on the user's "Merge it"; production `4.56.1-conference-records` verified 18:58 UTC). Rule open for 11 school-sports (see above).
- **Oct 7 — Profile cards fill the third slot** (user: "Use official profile cards for those"). Certification for 11 school-sports; all minimums 3; Iowa State complete.
- **Oct 7 — TCU, all 14 sports** (PR #236, merged `5f7f852`; production `4.57.0-tcu` verified 19:58 UTC, athletes 14/14). 41 minutes start to production (record still Iowa State's 29). New rules: `(Exh.)`, event-named opponents read `at`, suffixless golf places, cancelled golf rounds, swimming meets with archive stories.
- **Oct 7 — Texas Tech, all 10 sports** (PR #238, merged `a2a79df`; production `4.58.0-texas-tech` verified 20:34 UTC, `verify:prod` all sports, athletes 10/10 with three Instagram each, deep 10/10 on the preview). **26 minutes** start to production (new record). Survey attaches archive/TFRRS; fixture script saves TFRRS for every past meet; screenshot waits for the default sport.
- **Oct 7 — West Virginia, all 14 sports; Big 12 finished** (PR #240, merged `a5c1d26`; production `4.59.0-west-virginia` verified 21:14 UTC, `verify:prod` all sports, athletes 14/14 with three Instagram each, deep 13/14 on the preview). **30 minutes** start to production (2.1 min per sport, a per-sport record; Texas Tech's 26-minute total stands). New: kit `meetName` for TFRRS, places written alone, per-day tennis/wrestling tournaments merged, rifle archive stories.
