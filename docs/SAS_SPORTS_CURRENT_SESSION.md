# SAS Sports — Current State and Next Session

Last updated: October 8, 2026 (midday), America/Chicago. Production `4.64.1-texas-texas-am`.

**Read this whole file at the start of every SAS Sports session.** Keep it short: it holds only what the next session needs. Full evidence and every earlier session record are in `docs/SAS_SPORTS_HISTORY.md` (append-only; search it, do not read it whole). Per-school detail and limitations are in `docs/<SCHOOL>_MODULE.md`.

## Baseline

| Item | Value |
| --- | --- |
| Repository / default branch | `egassam/SAS-Sports` / `main` |
| Production | https://sas-sports.lovetogivepain.workers.dev (`/api/status` → `4.64.1-texas-texas-am`) |
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
| Alabama (SEC) | `alabama.mjs` | Complete (13 sports) | Rowing fills when published; golf shows place without field size (not published); 8 sports use profile cards (rosters publish too few Instagram, 262 profiles read); first live cards not yet observed (soccer at Florida Oct 8, volleyball vs South Carolina Oct 9) |
| Florida (SEC) | `florida.mjs` | Complete (13 sports) | Lacrosse fills when published; first live cards not yet observed (soccer vs Alabama Oct 8) |
| Georgia (SEC) | `georgia.mjs` | Complete (13 sports) | Added to the app Oct 7. 7 sports use profile cards (370 profiles read, no athlete Instagram); Track & Field, Gymnastics fill when seasons start; first live cards not yet observed |
| LSU (SEC) | `lsu.mjs` (own WMT card reader) | Complete (13 sports) | Added to the app Oct 7. Golf place only when the final story's headline gives it (cards publish none); Track & Field fills when published; first live cards not yet observed |
| Ole Miss (SEC) | `ole-miss.mjs` | Complete (11 sports) | Added to the app Oct 7. The Ally (women's golf) waits for its final story; Track & Field, Baseball, Softball, Basketball fill as seasons start; profile cards for Cross Country, Softball, Volleyball; first live cards not yet observed |
| Mississippi State (SEC) | `mississippi-state.mjs` | Complete (10 sports) | Added to the app Oct 7. Chile Pepper cross country points wait on TFRRS; Track & Field fills when published; Baseball uses profile cards; first live cards not yet observed (volleyball vs Georgia Oct 9) |
| Missouri (SEC) | `missouri.mjs` (WMT card reader, from LSU's) | Complete (13 sports) | Added to the app Oct 8. Gymnastics and Track & Field fill when published; profile cards for Cross Country, Tennis, Track & Field; Aug 5 soccer exhibition has no story (none published); first live cards not yet observed |
| Tennessee (SEC) | `tennessee.mjs` | Complete (12 sports) | Added to the app Oct 8. Rowing fills when 2026-27 is published; Baseball's third athlete is a profile card (2 links of 37); first live cards not yet observed |
| Texas (SEC) | `texas.mjs` | Complete (13 sports) | Added to the app Oct 8. One page for Track & Field and Cross Country (split by season); Rowing and Track & Field fill when published; profile cards for Cross Country, Golf, Rowing, Swimming & Diving, Tennis, Track & Field; first live cards not yet observed |
| Texas A&M (SEC) | `texas-am.mjs` (WMT, Missouri's reader) | Complete (12 sports) except source-blocked | Added to the app Oct 8. Baseball and Track & Field athletes when the 2026-27 rosters list players (both empty); Track & Field schedule when published; two golf finals "Completed" (headlines give no place); first live cards not yet observed |

**All 16 Big 12 schools are converted** (West Virginia last, October 7). **SEC:** Alabama and Florida (PR #242), Georgia and LSU (PR #244), Ole Miss and Mississippi State (PR #246), Missouri and Tennessee (PR #250), Texas and Texas A&M (PR #252) converted. Next: two more SEC schools. CUSTOM in the catalog (check each site first; LSU's "CUSTOM" was WMT): Arkansas, Auburn, Kentucky, Oklahoma, South Carolina, Vanderbilt.

## How to add and convert a school (fast path, October 8)

Texas + Texas A&M (Oct 8, 25 sports, about 75 minutes; one extra preview round for two bugs the screenshots found). Lessons: `add-school` finds no sports when the nav links lack `/schedule` (Texas): pass `--sports=`; WMT cards differ by site generation (A&M's `schedule-event-default__*`, venue in the date box) — dump one card before surveying; read every screenshot line for odd athlete names ("Roster for Baseball") and "did not return usable live data"; never `pkill`/`kill $(pgrep -f tests/)` from the shell that runs it.


Missouri + Tennessee: **43 minutes** from start to production for 25 sports (1.7 min per sport), one PR, both schools new to the app, one of them WMT. Earlier fast-path notes (Texas Tech, West Virginia, Alabama/Florida, Georgia/LSU, Ole Miss/Mississippi State) are in the history file under October 8. Start each slow step in the background and keep working while it runs:

1. **Add (1 min):** `NODE_USE_ENV_PROXY=1 node scripts/add-school.mjs --school=<id> --theme=<primary>,<secondary>,<onAccent> --write` for each school. It reads the football schedule page (directly, or through the private source when the site refuses the sandbox) and prints the publisher. The catalog's provider can be wrong: Missouri is listed as SIDEARM but is WMT. It writes the sports from the site's nav into `src/sponsored-sports.json`, `SCHOOL_SPORTS`, `TEAM_THEMES` and `tests/certified-schools.json`.
2. **Scaffold and port (1 min):** `node scripts/scaffold-school.mjs --school=<id> --write`, then `node scripts/port-handlers.mjs --from=<newest same-platform school> --to=<id> [--nickname=Old:New]`. SIDEARM: port from Tennessee or Mississippi State. WMT: port from Missouri, which reads both `__day` and `__month-day` boxes. For WMT, replace the school object with the source's shape (`cardSports`, real routes) and copy its `SCHOOL_MODULES` entry and handler arguments in `src/index.js`. Decide each line the script lists by eye: TFRRS team pages (`<ST>_college_<f|m>_<Name>.html`) and opt-in options. Turn every sport on.
3. **Fixtures and athletes, in parallel (2-4 min):** `fetch-school-fixtures --school=<id> --tfrrs-f= --tfrrs-m= --prune`. `--prune` removes the homepage, empty-template and duplicate routes from the module. Then fix `combinedSports` (two team pages: combined; one page for both: not). Start `athlete-evidence --school=<id> --pins <every sport>` at the same moment. A sport with 0 links is a profile-card sport (`athlete_profile_fallback_sports`). A sport with few links gets the printed `verifiedInstagrams` lines.
4. **Read (10-15 min):** `survey-school --school=<id>` (no GATE allowed). For WMT, `scripts/dump-cards.mjs <fixture>` prints the raw cards faster than reading HTML. Fix each sport's misreads, then `generate-module-tests --school=<id>` (it uses the test file's own date). Write hand-written checks with `__FILL_NAME__` placeholders and run `node scripts/fill-expected.mjs tests/<id>-module.mjs`; read every filled value against the official page. The records check must equal the published records: a mismatch found Missouri's unlabeled exhibition. Mutate each new rule, and remove rules whose mutation survives because another rule already covers them.
5. **Publish:** commit and push (keep `screenshots/` out; it is now ignored), open the PR, then run `npm run test:release`, `verify:preview --sports=all` for each school, `validate-schools <id> --athletes-only --base=<preview>` and `screenshot-school`, all in parallel. Read `recap_not_found` in the expanded-view lines: Missouri soccer's missing story was in the archive. Wait for the preview with an `until curl … | grep` loop on something the new build changes. Merge, then `verify:prod` and the athletes check on production.

Lessons from October 8:
- Athlete lists are cached per version for 6 hours; the key now also carries the sport's pins, so a new pin shows at once.
- `pkill -f` patterns can kill the shell running them: kill by PID.
- WMT cards differ between schools: Missouri's golf links have no recap class (labels "Final Recap", "Round 2 Recap"), golf places are in `result__text`, and exhibitions carry a `schedule-event-exhibition` marker.

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
- **Oct 7 — Alabama and Florida, 13 sports each; SEC started** (PR #242, merged `3c2afc1`; production `4.60.0-alabama-florida` verified 22:10 UTC, `verify:prod` all sports for both, athletes 13/13 each). **36 minutes** start to production for 26 sports (1.4 min per sport, record), the first two-school session.
- **Oct 7 — Georgia and LSU added to the app, 13 sports each** (PR #244). LSU is WMT with its own card reader. Shared fixes: WMT season-scoped profile links, story bodies opening with nested markup. New tools: `generate-module-tests`, `athlete-evidence`. Merged `5779733`; production `4.61.0-georgia-lsu` verified 23:08 UTC (`verify:prod --sports=all` both, athletes 13/13 both). 41 minutes start to production for 26 sports, with a new WMT reader.
- **Oct 7 — Ole Miss and Mississippi State added to the app, 21 sports** (PR #246, merged `bd98783`; production `4.62.0-ole-miss-mississippi-state` verified 01:21 UTC Oct 8, `verify:prod --sports=all` both, athletes 11/11 and 10/10, athletes passed on the first preview). Shared: story-block recaps read; kit `volleyballSetScores`. 117 minutes wall clock, about 40 of them lost to a container restart.
- **Oct 8 — In-season badge glow, all schools** (user: "Can we add a glow to the in season", then "Go"; PR #248, merged `b0a7549`; production `4.62.1-season-glow` verified 01:40 UTC). The badge text uses each school's on-accent color, with a glow tinted toward white; readable on dark primaries (Mississippi State, LSU, West Virginia, K-State) and light ones (Oklahoma State, Colorado).
- **Oct 8 — Missouri and Tennessee added to the app, 25 sports** (user: "Add Missouri and Tennessee. Learn and optimize for faster onboarding"; PR #250, merged `a941a94`; production `4.63.0-missouri-tennessee` verified 11:13 UTC, `verify:prod --sports=all` both, athletes 13/13 and 12/12). **43 minutes** start to production. Missouri is WMT (LSU's reader). New tools: `add-school`, `port-handlers`, fixtures `--prune`, `fill-expected`, athlete-evidence `--pins`; athlete cache key carries pins.
- **Oct 8 — Texas and Texas A&M added to the app, 25 sports** (user: "Onboarding of Texas and Texas A&M. Learn and optimize for increased speed"; PR #252). Texas SIDEARM (Tennessee's handlers), A&M WMT (Missouri's reader, newer cards). Shared fix: season-roster links are not athletes. Tools: port-handlers renames quoted ids/escaped hosts first; generate-module-tests handles two sports on one page. Merged `bf36ec7`; production verified 12:19 UTC (`verify:prod --sports=all` both, athletes 13/13 and 10/10). About 105 minutes start to production.
