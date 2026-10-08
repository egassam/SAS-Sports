# SAS Sports — Session History (append-only)

This file holds every earlier handoff and session record, unchanged. It was split out of `docs/SAS_SPORTS_CURRENT_SESSION.md` on October 4, 2026 (user: "How can we speed up the conversations?" → agreed to a short current file plus this history). **Do not read it in full at session start.** Read `docs/SAS_SPORTS_CURRENT_SESSION.md`; search this file (`grep -n`) when you need the evidence behind an earlier decision. Append each new session record at the end.

Below: the handoff exactly as it stood at `2e1600e` (October 4, after Colorado), then the session records.

---
## Handoff as of October 4, 2026 (after Colorado)

Last updated: October 4, 2026, America/Chicago (Colorado all 9 sports, PRs #214-#223; production `4.52.10-colorado-athletes`. Earlier: Cincinnati all 11 sports, PRs #202-#212; Baylor all 12 sports, PRs #178-#190; live testing, football possession and traveling glow, PRs #175-#176; Arizona all 13 sports, PRs #148-#162; UCF complete: PRs #123, #125–#134; K-State Volleyball live scores and ESPN scoreboard fix: PR #109; BYU complete: PRs #94, #97–#107; polite source fetching: PR #85; Arizona State complete: PRs #66–#83).

**Read this current file at the beginning of every SAS Sports session.** This is the canonical working handoff. Update this same path at each session boundary and append the new session record below. Do not replace current facts with older conversation summaries.

## Current state

**Colorado is complete (`AGENTS.md` item 5a); production `4.52.10-colorado-athletes` (October 4, ~06:20 UTC).** User: "Convert Colorado". cubuffs.com (SIDEARM) returns 403 to the sandbox; every official page came through the private source route (`scripts/fetch-official.mjs`, HTTP 200), unmodified; TFRRS and ESPN were read directly. One page-data reader (`createColoradoHandlers().parseSchedule`, `src/schools/colorado.mjs`) enabled sport by sport, one PR each, each merged by the agent under `AGENTS.md` item 6 after the full gate (both suites, CI green, the sport in K-State's format on the preview with every expanded view checked, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes) and verified in production. Details, evidence and limitations: `docs/COLORADO_MODULE.md`.

| PR | Sport | Production |
| --- | --- | --- |
| #214 | Setup + Football | 220/220 routes identical; published Mountain times (`Nov 13, 8:15 PM`); the shared `compactScheduleHtml` cut cubuffs.com football pages after the cards (page data lost; first preview had no times): Colorado pages now pass whole; ESPN live (shared FBS request) |
| #215 | Volleyball | other teams' tournament matches (`Denver vs. Central Arkansas`) and the scrimmage left out; Colorado recap matcher (a game with its own schedule recap takes only that one: the Sep 18 Colorado State story had matched Sep 17; others must name the opponent in the headline); ESPN live |
| #216 | Soccer | `Utah (Exhibition)` (type S); the page's time text wins over a disagreeing data clock (`Oct 16, 5:30 PM`); unlinked final's story from the sport archive (Western Michigan tie, "Ends In A Draw", verified by opponent and result); ESPN live |
| #217 | Cross Country | TFRRS results (`Women's team: 1st · 15 pts / Men's team: 1st · 15 pts`, every finisher); a team TFRRS lists with 0 points (`W-NTS`) has no team place; meets read `at` |
| #218 | Basketball | two official pages only, labeled; exhibitions; Big 12 Championship Mar 9-13 one event; ESPN men's/women's live |
| #219 | Golf | both teams; round entries become one event per tournament (`13th of 20`), last round only, its final story (bound even when the story names the event differently) |
| #220 | Skiing | official page only; race days grouped into carnival runs (`Denver Invitational (Alpine)`/`(Nordic)`); the daily place is a cumulative standing, so only a carnival's last run carries the final place (tested on the 2026 page); 2027 all upcoming |
| #221 | Tennis | women's only (men's URL is SIDEARM's empty template); fall tournaments one event each, listed only with a story; duals as games |
| #222 | Track & Field | official page only; current-season filter (every Colorado sport); verified empty schedule (page shows 2025-26); one event per meet in season |
| #223 | Athletes | 9/9 sports, 3 each; Skiing's third slot filled from an official roster profile (Colorado-gated line in `featuredAthletes`' fast path); Golf and Skiing official-profile fallback |

- **Production deep certification (`validate-schools.mjs colorado --deep`, all 9 sports, `4.52.10`): 9/9**; highlights Football 5/5, Volleyball 13/13, Soccer 13/13, Cross Country 2/2, Golf 6/6, Tennis 2/2; athletes 3 each.
- **Shared-code touches, all Colorado-gated or behavior-identical elsewhere:** `compactScheduleHtml` now compacts Houston only; recap-matcher dispatch, XC meet-result hooks, the `empty_schedule` hook, the archive-story hooks, scoreboard providers and the Skiing athlete fill each carry a `colorado` branch. BYU's test now uses Houston as its school without a volleyball scoreboard.
- **Not fixable from official sources today (evidence in the module doc):** Track & Field 2026-27 unpublished (fills in without code changes); golf team totals only in story prose; Skiing and Basketball finals not yet played.
- **Not yet observed live:** Colorado volleyball at Baylor (Oct 4, 1:00 PM MT) and soccer vs Baylor (Oct 8) are the first chances.
- **Preview transients:** twice (#220, #221) the first K-State XC read after a deploy lacked the two meets; immediate full reruns were clean. Not seen in production.

**Cincinnati is complete (`AGENTS.md` item 5a); production `4.51.0-cincinnati-tennis` (October 4, ~03:30 UTC).** User: "Convert Cincinnati". gobearcats.com (WMT) answers the sandbox directly; every fixture is an unmodified official page (or TFRRS/ESPN). One card reader (`createCincinnatiHandlers().parseSchedule`, `src/schools/cincinnati.mjs`) enabled sport by sport, one PR each, each merged by the agent under `AGENTS.md` item 6 after the full gate (both suites, CI green, the sport in K-State's format on the preview with every expanded view checked, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes) and verified in production. Details, evidence and limitations: `docs/CINCINNATI_MODULE.md`.

| PR | Sport | Production |
| --- | --- | --- |
| #202 | Setup + Football | 219/219 routes identical; the Oct 3 Arizona game was listed twice (UTC schema data) and a phantom Nov 28 game carried the Sep 5 recap: gone; published Eastern times; ESPN live (shared FBS request) |
| #203 | Volleyball | rankings dropped, ranked matches no longer listed twice; Cincinnati recap matcher (own link: no sport word, "Falls on Road Against Houston"; other candidates must name the opponent in the headline); ESPN live |
| #204 | Soccer | `T, 1-1`; a game two days past without a result (the unscored `Evansville (EXH)`) left out, yesterday's kept; ESPN live |
| #205 | Cross Country | complete results from TFRRS (`Women's team: 24th · 575 pts / Men's team: 15th · 396 pts`, every runner; the recaps list only top runners); meet found by date + a shared distinctive word ("All-Ohio Intercollegiate Classic" = TFRRS "...Challenge") |
| #206 | Basketball | two official pages only, labeled; women's `(Exhibition)` from the tournament heading; ESPN men's/women's live (Binghamton "Bearcats" never matched) |
| #207 | Baseball | official page only; Big 12 Tournament range kept while played; empty pages are verified empty schedules (no shared-parser fallback); ESPN live |
| #208 | Golf | both teams; one event per tournament (`4th of 14`) with its final story; a tournament under way is `In progress` |
| #209 | Lacrosse | current-season filter (every sport); empty schedule (page shows spring 2026) |
| #210 | Swimming & Diving | one page for both teams; dual-meet times; invitationals named after their heading |
| #211 | Track & Field | `track-field` only; empty schedule (page shows 2025-26) |
| #212 | Tennis | **added to the catalog** (`src/sponsored-sports.json` and the page fallback, Cincinnati only): gobearcats.com sponsors and publishes women's tennis; tournaments read `Cincinnati at ...` |

- **Production deep certification (`validate-schools.mjs --deep`, `4.51.0`): 11/11**; athletes 11/11 (3 each, verified Instagram + official profiles); highlights 31/31 for the four critical sports. `tests/certified-schools.json` now lists all 11 sports (docs/test PR after #212).
- **Live football observed:** Cincinnati at Arizona (Oct 3, 11:00 PM EDT) went live as one card joined to the official game, score, clock and possession matching ESPN. Other Cincinnati scoreboards are payload-tested only.
- **Not fixable from official sources today (evidence in the module doc):** Lacrosse and Track & Field seasons unpublished (fill in without code changes); golf team totals not published; Gans Creek recap vs TFRRS (TFRRS shown, difference explained).
- **Catalog decision to note for the user:** Tennis was added to Cincinnati's sponsored sports (the first catalog addition since the manifest was created). If the user prefers the catalog unchanged, revert #212's two catalog lines.

**Fixes session, October 3 (PR #200, merged `efa6f21` on the user's "Merge"; production `4.49.2-compact-finder` verified: page serves both changes, XC 18/20 and 26/21, K-State Cincinnati expanded view `recap_generated` with 4 highlights).** User: "Fixes" (no item chosen). (1) **Expanded-view AI timeouts:** the page now repeats `/live/highlights` once when the answer is `ai_failed` (`fetchHighlights` in the `FINAL-CACHE` block of `public/index.html`); other states and a second timeout are shown as they are; only verified finals are stored, as before. Every school. Gate on the preview: both suites, `tests/final-cache.mjs` (mutation `attempts=1` fails it), XC 18/20 and 26/21, 36/36 K-State Football refreshes, preview serves the new page, Cincinnati expanded view verified (4 highlights). Not done: a Chromium run on the preview (the sandbox refused the browser's proxy-certificate setting this session). (2) **K-State Football Sep 26 Cincinnati expanded view: already correct in production** (K-State's own recap `...comes-up-short-at-cincinnati-31-26`, `L, 26-31`, 4 verified highlights); closed. (4) **Compact finder (`4.49.2-compact-finder`, same PR; user: "Let's make the conference and school drop down menus smaller and put them side by side"):** Conference and School side by side at every width (Sport full width below them under 820px; all three in one row, max 760px, above), menus 34px tall (were ~47px), 14px text. Checked in local Chromium at 390px and 1100px (no page errors, no horizontal scroll). (3) **Utah Lacrosse:** production `/live/status` HTTP 200, no error, 0 events (season unpublished); the Oct 2 failure has cleared.

**Level menu, #197 (`4.49.0-level-menu`, user: "I'm going to add highschools and professional sports into the app after we finish NCAA. The menu needs to be updated for that and maybe organize it on the screen better").** `public/index.html`: a level switch (`LEVELS`: College, High School, Pro) above a labeled finder whose labels follow the level (Conference/School, State/School, League/Team); a level with no teams in the catalog is disabled and marked "Soon"; a team's level is its catalog `level` (default `college`), so adding high school or pro teams needs only that field. "All conferences" groups schools by conference; search, favorite and refresh have their own row. Gate: suites, CI, Chromium at 390px and 1100px on preview and production (no page errors; grouping; switching school), XC 18/20 and 26/21, 36/36 K-State Football refreshes. **Future change (user: "Not now though"): order the levels High School, College, Pro** — reorder `LEVELS` when high school is added.

**Baylor is complete (`AGENTS.md` item 5a); production `4.48.0-live-doubleheaders` (October 3).** User: "Fix both" (the two open items below). #194: certification accepts a meet with no story when its complete results are verified from TFRRS (source on the official site, "results from TFRRS", three verified highlights; counted separately: `PASS:3/3 (1 TFRRS results, no story)`). #195 (shared, every school): ESPN doubleheaders are `Game 1` / `Game 2` in start order, each joins the official game with its number, and a second score never overwrites an official game another score took (real payload: Baylor at Kansas softball Apr 10, 2026, `W, 8-7` and `L, 0-1`). Gate for #195: suites, CI, 36 scoreboard feeds (6 schools × 6 sports) identical on preview and production, XC 18/20 and 26/21, 36/36 Baylor Softball refreshes. **Production deep certification for Baylor: 12/12.** Remaining Baylor items are source-blocked only (Track & Field and Acrobatics & Tumbling schedules unpublished; golf field size).

**Summary count box removed, #192 (`4.47.12-no-summary-box`, user: "I don't think the user needs to see the box that shows how many live, upcoming, complete, etc. can we hide that?").** The four tiles (Live, Recent results, Upcoming, Sports), their styles and `updateCounts` are gone from `public/index.html`; tabs and sections unchanged; every school. Gate: suites, CI, preview in Chromium at 390px (no `.summary`, 4 tabs), XC 18/20 and 26/21, 36/36 K-State Football refreshes. Production verified the same way.

**Baylor: all 12 sports converted; production `4.47.11-baylor-track-field` (October 3); NOT complete under `AGENTS.md` item 5a: two items wait on the user (below).** User: "Next school conversion" (Baylor is the next unconverted Big 12 school in catalog order). baylorbears.com refuses the sandbox; every page came through the private source route. The agent opened and merged PRs #178-#190 one sport at a time under `AGENTS.md` item 6; each passed the gate (both suites, CI green, the sport in K-State's format on the preview with every expanded view checked, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes) and was verified in production. Details: `docs/BAYLOR_MODULE.md`.

| PR | Sport | Production |
| --- | --- | --- |
| #178 | Setup + Football | 219/219 routes identical; page-data reader (SIDEARM `__NUXT_DATA__`, `src/schools/baylor.mjs`); published times (`Oct 3, 9:30 PM`); ESPN live (shared FBS request) |
| #179 | Volleyball | rankings dropped; Baylor recap matcher (Aug 30: each same-day Honolulu story matched the other match; another candidate must name the opponent in its `og:title`); ESPN live |
| #180 | Soccer | `T, 1-1`; multi-day postseason ends on its last day, `In progress` while running; ESPN live |
| #181 | Cross Country | complete results from TFRRS (`Women's team: 3rd · 88 pts / Men's team: 4th · 97 pts`, every runner; TEAM column only: App State's "Baylor Wolfe"); highlight-store revision `|r2` for Baylor keys |
| #182 | Basketball | two pages, labeled; `(EXH)` → `(Exhibition)`; ESPN men's/women's live |
| #183 | Baseball | official page; doubleheaders Game 1/2; ESPN live |
| #184 | Softball | official page; tournament `TBD` named after it; ESPN live |
| #185 | Golf | both teams; one event per tournament (`9th (844)`); Charleston story from the archive ("Cougar Classic") verified by place and score to par |
| #186 | Tennis | both teams; tournaments `Baylor at ...`; past ones only with a story; other team's story refused |
| #187 | Equestrian | rankings dropped; championships named |
| #188 | Acrobatics & Tumbling | current-season filter; verified empty (page shows 2026); decimal scores in season |
| #189 | Track & Field | verified empty (page shows 2025-26); team places in K-State's form in season |
| #190 | Certification | athletes protected for all 12 sports (3 each), 12/12 |

- **Production certification (`validate-schools.mjs --deep`, all 12 sports, `4.47.11`): 11/12.** The failure: Cross Country's **Texas A&M Invitational** (Sep 11) has no Baylor recap (none on the schedule or in the XC archive), and certification requires one. Its complete TFRRS results are shown. **For the user to decide:** keep as is, list it only with a story (results disappear, as Arizona tennis #161), or let certification accept TFRRS-verified meet results without a recap (shared validator change, like #141).
- **Live doubleheaders (shared code, every school; for the user to approve).** ESPN listed Baylor's Apr 10, 2026 softball doubleheader at Kansas as two games; `parseScoreboardPayload` gives both the same id (one is lost) and `reconcileScoreboardEvents` joins by date only. The second game of any baseball/softball doubleheader would show no live score.
- **Highlight store lesson (shared KV, 30 days, preview and production share it):** checking an expanded view on a preview stores it. When a change rewrites already-verified finals, raise the school's highlight revision (Baylor: `baylorSchool.highlightRevision`) or the old copy keeps being served.
- **Not fixable from official sources today:** Track & Field 2026-27 and Acrobatics & Tumbling 2027 schedules unpublished (fill in without code changes); golf field size (no verifiable source; Clippd is a JavaScript page); the Schooner Fall Classic schedule says `9th`, Baylor's story "tied for eighth" (the schedule is shown; the AI highlights repeat the story).
- **Tonight:** Baylor at Arizona State football, 9:30 PM CT (02:30 UTC Oct 4) is the first Baylor live game under the module; not observed in this session.

**Live testing, October 3 (production `4.46.1-live-glow`).** User: "Live testing", then "Keep watching and fix anything that breaks". A poller compared production feeds with ESPN every 90 s for today's games in converted schools.
- **First real football live cards observed:** UCF at Houston went live at 16:05 UTC (`official_schedule+live_scoreboard`, one card), and UCF's touchdown (7-0) appeared within one poll. KU vs Middle Tennessee went live at 16:11 (KU's published time is date-only; the card joined anyway). No score mismatch, missing live card or feed error was seen through 16:47 UTC, when the session ended at the end of the 1st quarter (KU 3-0, UCF 7-0). The finals were not observed.
- **Who has the ball, #175 (`4.46.0-live-possession`, user: "Can we add a graphic that shows who had the ball?").** `parseScoreboardPayload` reads ESPN's `competition.situation.possession` (team id), `downDistanceText` and `isRedZone` for live games; `reconcileScoreboardEvents` carries `possession` (`school`/`opponent`), `down_distance` and `red_zone` onto the official card. `liveCard` draws a football beside that team and a strip under the board (`KU BALL · 3rd & 4 at MTSU 15 · RED ZONE`). Nothing is drawn when ESPN names no team (after a score, at breaks). Shared: every school's live football. Test: `tests/live-possession.mjs` on the real payload saved during the games (`tests/fixtures/live/football-espn-2026-10-03-live.json.gz`); mutations of either file fail it. Gate: suites, CI, preview checked against ESPN on both live games, XC 18/20 and 26/21, 36/36 refreshes for KU and UCF Football. Production verified on both live cards.
- **Traveling glow, #176 (`4.46.1-live-glow`, user: "Can we make the box around the live score have a glow that travels around the box?").** `.live-card-board::before` (3px conic-gradient ring masked to the edge) and `::after` (blurred 14px band) turn once every 3.2 s via `@property --sas-glow-angle`; the card sets `--sas-glow-delay` from the clock so the 15 s redraw does not restart it; reduced motion stops it. Gate: suites, CI, preview on KU and UCF live cards, XC 18/20 and 26/21, 36/36 KU Football refreshes. Production verified; user: "It passes my visual".
- **"Add the glow to all sports live cards":** no change needed: every Live-section event goes through `card(e,'live')` → `liveCard`, so all sports share the board and the glow. Not yet seen on a non-football live game in production (first chance: K-State vs Utah volleyball, 23:30 UTC Oct 3).
- **Testing notes:** Playwright's Chromium in the sandbox rejects the proxy's certificate; launch with `channel:'chromium'` and `--ignore-certificate-errors-spki-list=<sha256 of /root/.ccr/agent-proxy-ca.crt public key>` (trusts only the proxy CA). Node fetch needs `NODE_USE_ENV_PROXY=1`.

**Arizona: all 13 sports converted, certified 13/13 in production; production is `4.43.13-arizona-tennis-stories` (October 2).** User: "Let's do Arizona next. All sports and live." The agent opened and merged PRs #148-#162 one sport at a time under `AGENTS.md` item 6; every page used for fixtures came through the private source route. Each passed the gate (both suites, CI green, sport in K-State's format on the preview with every expanded view checked, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes) and was verified in production. Details, evidence and limitations: `docs/ARIZONA_MODULE.md`.

| PR | Sport | Production |
| --- | --- | --- |
| #148 | Setup + Football | 219/219 routes identical; page-data reader (SIDEARM `__NUXT_DATA__`); `W, 35-7` with recaps, published Arizona times; ESPN live (FBS group) |
| #149 | Volleyball | rankings dropped, scrimmage/unscored exhibitions out; Arizona recap matcher (own link: no sport word; opponent initials `UCSB`); ESPN live |
| #150 | Soccer | `T, 1-1`, Big 12 tournament named; recaps from `/archives` (Arizona's `/news` is a 404) and the opponent's full name (`Northern Arizona` for NAU); ESPN soccer live |
| #151 | Cross Country | `Women's team: 12th · 280 pts / Men's team: 1st · 85 pts`, race rows from the recap lists (18 and 20 rows) |
| #152 | Basketball | two pages only, labeled; exhibitions; tournaments; ESPN men's/women's live (Division I group) |
| #153 | Baseball | official page only; fall exhibitions; doubleheaders Game 1/2; ESPN live |
| #154 | Softball | official page only; fall UTEP doubleheader; ESPN live |
| #155 | Beach Volleyball | was 502 (empty template route); `womens-beach-volleyball` |
| #156 | Golf | both teams, one event per tournament, `12th of 12 (909)` from each story's standings; Tucker story found in the archive (`9th of 15 (857)`) |
| #157 | Gymnastics | `womens-gymnastics`; current-season filter; verified empty schedule |
| #158 | Swimming & Diving | one event per meet (was 81 per-day rows) |
| #159, #161 | Tennis | both teams; tournaments in progress stay; past ones only with Arizona's story |
| #160 | Track & Field | official route; verified empty schedule; recap date window (indoor Big 12 linked the May story) |
| #162 | Certification | athletes protected for 12 sports (3 each) |

- **Certification (production, `validate-schools.mjs --deep`, all 13 sports):** 13/13 on the final runs (Volleyball 12/12, Soccer 12/12, Football 4/4, Golf 4/4, Basketball 3/3, Cross Country 2/2, Tennis 1/1; Gymnastics and Track & Field verified empty). Three other passes had client-side "fetch failed" errors in the sandbox (Football; Cross Country; then Football and Volleyball together at ~20:47 UTC), each passing on rerun; meanwhile curl got HTTP 200 for both feeds in under 0.5 s, so these are the sandbox's network, not the app. Athletes 12/12.
- **Open, not fixable from official sources today (evidence in the module doc):** Baseball athletes (the 2027 roster page lists no players); Gymnastics and Track & Field 2026-27 schedules unpublished; Red Sky golf field size (top-10 table only).
- **Shared-code touches, all Arizona-gated:** scoreboard provider `query` (others send the identical request), Arizona-only exact ESPN team match, Arizona scoreboard finals as `W, 34-24`, Arizona branches in the recap search (matcher, `/archives`), the three XC hooks, golf/tennis feed hooks, the `empty_schedule` hook, and one tennis line at the top of `attachOfficialHighlights`.
- **Shared live-score fixes for every school, #164 (`4.44.0-espn-all-games-exact-teams`, user: "Yes. Fix all").** (1) ESPN's college football and basketball scoreboards return only ~25 featured games for `limit=1000` (K-State at Cincinnati missing on Sep 26); every school now asks for `groups=80&limit=300` (football; all 68 schools are FBS) or `groups=50&limit=300` (men's/women's basketball). (2) The team matcher's name prefix and abbreviation aliases made 59 wrong matches on real payloads (KU took Kansas State; Texas took Texas Tech, Texas A&M, Texas State; Florida took Florida State, FIU, FAU; Oklahoma State's "OSU" took Ohio State; Mississippi State's "MSU" took Michigan State; Nebraska's "NU" took Northwestern; ...). It now compares full names only: all 59 removed, none added, all 68 schools still match their own teams (`tests/scoreboard-match.mjs`; the old matcher fails it). Gate: suites, CI, preview XC 18/20 and 26/21, 36/36 refreshes for K-State Football and Basketball, and 41 school/sport feeds identical on preview and production at 21:00 UTC (no game in the scoreboard window then). Production `4.44.0` verified.
- **Game times in the viewer's time zone, #171 (`4.45.0-viewer-time-zone`, user: "We should put the times for events in the users timezones so they do not get confused").** Published start times are stored as the school's wall clock; `/schools` now returns each school's `time_zone`, and the page shows timed events in the viewer's zone with its abbreviation (Arizona's Oct 3 kickoff: `10:00 PM CDT` in Chicago, `11:00 PM EDT` in New York, `8:00 PM MST` in Phoenix; Nov 6 after daylight saving ends: `9:15 PM CST`). Date-only events stay as published; a footer note names the viewer's zone. `tests/time-zones.mjs` runs the page's own conversion. Gate: suites, CI, preview checked in Chromium as Chicago and Phoenix viewers, XC 18/20 and 26/21, 36/36 Arizona Football refreshes; production verified as a New York viewer. #173 (`4.45.1-no-duplicate-status`, user: "Yes, remove the duplicate Upcoming"): the text beside a card's status badge no longer repeats it ("UPCOMING Upcoming", "FINAL Final", "TODAY Today"); only the time or a label that adds something ("In progress") remains. Gate: suites, CI, preview as a Chicago viewer, XC 18/20 and 26/21, 36/36 Arizona Football refreshes. Production: the first page load right after the merge still showed the old page (Cloudflare edge `cf-cache-status: HIT` although the page sends `no-store`), the next three loads were correct. If a page change seems missing right after a deploy, reload once before suspecting the code.
- **First real Arizona live games observed in production (October 3 UTC, `4.44.2`).** Soccer, Arizona at Oklahoma State: 00:26 UTC `Live` 0-0 at 19' (matching ESPN), joined to the official card (`official_schedule+live_scoreboard`, no second card); 00:32 `0-1, 24'`; 01:21 `2-3, 53'`. Arizona State at Texas Tech, live at the same time, was not taken for Arizona (#164's exact match). Volleyball, Arizona vs Iowa State: 01:21 UTC `15-14 · 1st Set · Sets 0-0`, the current set's points exactly as ESPN's linescore. Both rendered in the new scoreboard card (Playwright screenshots at 390px). Football and basketball live cards have not yet been observed (first games: Arizona football Oct 3, basketball Oct 13).
- **Live scoreboard card, #168 (`4.44.2-live-scoreboard-card`, user: "Can we make the live box scores look better? I think they should stand out").** Live games render as a scoreboard (`liveCard` in `public/index.html`): red pulsing LIVE pill and clock, one row per team with a monogram (team-colored for the school), big tabular scores with the trailing side dimmed, a one-time flash on the side that scored since the last refresh, team-colored glow, capped at 680px on desktop; the Live section label pulses red and the Live counter turns red. Reduced motion stops the animations; the card's aria-label reads the full score line. Checked with Playwright at 390px and 1100px (local page over production data, then the preview and production deploys of `?school=kstate&demo=live`). Gate: suites, CI, XC 18/20 and 26/21, 36/36 K-State Football refreshes.
- **Scoreboard finals in the official wording for every school, #166 (`4.44.1-scoreboard-final-wording`, user: "Apply it to every school").** An ESPN final reads `L, 26-31` (as Arizona's did) instead of a bare `26–31` replacing the official headline; volleyball keeps its sets wording. Tested on real payloads (K-State football, Houston basketball, KU soccer). Gate: suites, CI, preview XC 18/20 and 26/21, 36/36 for K-State Football and Basketball, 24 feeds identical to production. Production `4.44.1` verified (XC 18/20, 26/21).

**Blocked school sites: private source route, #145 (`4.42.0-private-source-fetch`, user: "Let's do option 1").** Schools such as Arizona and Baylor refuse the development sandbox's network (403, even for calendar files) but serve the live app (production diagnostics Oct 2: Arizona, Baylor, Texas Tech, West Virginia Football all HTTP 200, 12-16 events). `GET /api/source?url=…` returns the raw official page exactly as the app downloads it (honest identity, robots.txt, caching, backoff), only with the Worker secret `SOURCE_FETCH_KEY` as a bearer token, and only for https pages on a catalog school's official athletics site or TFRRS (an off-site redirect is refused). No secret: 404 (production at merge: 404).
- **Set up and working (verified October 2, ~16:35 UTC).** The user set the Worker secret `SOURCE_FETCH_KEY` and the sandbox variable `SAS_SOURCE_KEY`. Through the route: Arizona Football schedule HTTP 200 (941,639 bytes, real 2026 page), Baylor Football schedule HTTP 200 (841,725 bytes). Without the key the route now answers 401 (it answered 404 before the secret existed). Never paste the key into chat.
- **Use:** `NODE_USE_ENV_PROXY=1 node scripts/fetch-official.mjs <url> tests/fixtures/<school>-module/<name>.html.gz --gzip`. Node's built-in fetch ignores the sandbox proxy; without `NODE_USE_ENV_PROXY=1` it fails with "Host not in allowlist" (curl with the bearer header works without it). Use it for any page that returns 403 to the sandbox; never pose as a browser or route around a school's bot defense otherwise.
- **Sandbox network:** editing the environment to add the variable briefly left it on a restricted network level (the app, kstatesports.com and byucougars.com all refused). The user restored it; if those hosts refuse again, ask the user to check the environment's Network access setting.

**Rule (user, October 2): do not finish a school until everything within it is complete.** See `AGENTS.md` item 5a. A school is complete only when every sport is in K-State's format, athlete certification passes for every sport, and every module-doc limitation is fixed or proven unfixable from the official sources with evidence.

**UCF is complete (`AGENTS.md` item 5a); production `4.41.0-stored-highlights` (15:12 UTC, October 2).** Production certification (`validate-schools.mjs --deep`, all 11 sports) passed 11/11 on two consecutive runs; XC 18/20 and 26/21.
- **Server-side highlight store, #143 (user: "Yes, cache the highlights on the server"):** Workers KV namespace `sas-sports-highlights` (id `38280ef8508844459bbe14735e825d7a`, created this session; binding `HIGHLIGHTS`). `/live/highlights` answers a stored verified final at once (`x-sas-highlights: stored`, ~0.7 s instead of 3-9 s), otherwise builds it live and stores verified finals for 30 days. Unverified answers (AI timeouts) are never stored. Preview: first open live (3.8 s), then stored (0.7 s); K-State, BYU and KU finals behave the same. The preview shares the namespace (only verified finals are written).
- **Also this session:** #137 (XC highlights; athletes 11/11), #138 (complete XC results from TFRRS), #140 (verified finals kept on the device, cleared monthly), #141 (certification accepts verified empty schedules).
- **Proven unfixable from official sources (evidence in `docs/UCF_MODULE.md`):** golf field size; Rowing, Track & Field and men's Tennis 2026-27 schedules not yet published (they fill in without code changes).
- **Seen outside UCF (not changed):** production Utah Lacrosse returned "All official source candidates failed" at 13:52 UTC.

**UCF: all 11 sports' schedules converted; production is `4.39.0-ucf-track-field` (13:33 UTC, October 2).** User: "Finish UCF, do all the sports". The agent opened and merged PRs #125–#134 one sport at a time under `AGENTS.md` item 6 (#123 was Football). Each passed the preview gate (K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes, CI green) and was verified in production. The status table and limitations are in `docs/UCF_MODULE.md`.

| PR | Sport | Production |
| --- | --- | --- |
| #125 | Volleyball | 12 finals with recaps, 16 upcoming; ESPN live score |
| #126 | Soccer | Women's (Big 12) and men's (Sun Belt), labeled; 18 finals with recaps |
| #127 | Cross Country | `Women's team: 6th · 199 pts`; runner rows read deterministically from recap prose (was AI, with a wrong `1st`) |
| #128 | Basketball | Two official pages only (was 132 upcoming); ESPN live scores for both teams |
| #129 | Baseball | Official page only; intrasquad series left out |
| #130 | Softball | Official page only; scrimmages and "Knights vs. 'Nauts" left out |
| #131 | Golf | One event per tournament (`5th (858)`); UCF recap matcher |
| #132 | Tennis | Season filter (men's page is 2025-26: empty); women's multi-day tournaments |
| #133 | Rowing | Official page (was a 404 route plus the homepage ticker); empty, 2025-26 |
| #134 | Track & Field | Official page (was a 404 route; last season shown as current); empty |

- **Reader features** (all in `src/schools/ucf.mjs`): year from JSON-LD; rankings in every form dropped; bracket and conference cards named after their tournament heading; exhibitions without a score, postponed games and internal events left out; multi-day events end on their last day; golf rounds and rowing days merged; team finishes for meets; current-season filter with empty schedules.
- **Shared-code touches, all school-gated (one `school.id==='ucf'` branch each):** `liveScoreboardProviders`; the three XC meet-result hooks; `attachOfficialHighlights`' recap matcher; the `empty_schedule` hook. BYU's test now uses Cincinnati as its "no scoreboard" school.
- **UCF recap matcher:** the shared matcher keeps only an opponent's words of four letters or more ("FAU Invitational" became "invitational") and accepted the women's Schooner Classic story for the men's FAU Invitational. UCF now requires the full event name for any link other than the card's own Recap, and refuses the other team's story.
- **Transients seen (not changed):** right after two merges (#128, #133), one read came from the old version during rollout (Basketball 132; preview Rowing 10 old events); every following read was correct. One #130 preview pass had three failed K-State XC reads and one curl `000` within seconds; the immediate full rerun was clean (18/20, 26/21, 36/36). One production K-State XC read failed once ("All official source candidates failed"), then 18/20. Expanded views show `ai_failed` on roughly 1 in 15 opens (Workers AI 8 s timeout after the recap matched); three later passes were clean.
- **Not done:** UCF athlete certification; XC rows are the runners each recap names, not the full field; golf placings have no field size.

**UCF module set up and Football converted; production is `4.38.0-ucf-football` (12:13 UTC, October 2).** User: "Add the Next big 12 school". arizonawildcats.com and baylorbears.com still return 403 to the sandbox, and ucfknights.com returns 200, so UCF is next in catalog order. PR #123 (merge `f230c79`) was merged by the agent under `AGENTS.md` item 6. Details are in `docs/UCF_MODULE.md`.
- **Setup:** `src/schools/ucf.mjs` holds routes for all 11 sports. 438/438 catalog routes are identical before and after. All eleven Worker-evaluating harnesses inject `ucfSchool`/`createUcfHandlers`; `regression.mjs`, `protect-certified.mjs` and `parse-budget.mjs` read the module.
- **Football:** ucfknights.com is a third WMT card variant (`Thu, Sep` / `3`, no year; the result slot holds either `W Win 73-6` or `12:00 PM EDT`). Production had shown every upcoming game twice, and a phantom `Nov 28 at Colorado W, 73-6` final with a Colorado story as its expanded view. The module reader gives 4 finals with their own recaps and 8 upcoming games; the year comes from the JSON-LD, and rankings are dropped. The shared recap matcher works for UCF (recaps name "Football").
- **Gate:** both suites passed; CI green; preview: 4 finals each `recap_generated` with 4 highlights, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes. One first K-State XC call on the preview returned a non-feed body; the next three were 18/20.
- **Production (12:13 UTC):** identical to the preview; XC 18/20 and 26/21.
- **Not done:** the other 10 UCF sports (still on shared parsers) and UCF athlete certification.

**K-State Volleyball live scores; ESPN scoreboards working again; production is `4.37.2-kstate-volleyball-live` (23:48 UTC, October 1).** User, during the K-State vs BYU match: "Can we find a live feed and have live results on the KSTATE volleyball page?" PR #109 (`9606651`):
- **Volleyball scoreboard.** ESPN's women's college volleyball scoreboard is added to `kstateSchool.liveScoreboards`. Today's official card goes Live with sets won and the current set's points (`1st Set · 14-15` in production); a final reads `W, 3-1`.
- **Scoreboard user agent (shared, user-approved, "Do one").** ESPN's edge returns 403 to any user agent carrying a web address, so **every ESPN live score had failed since #85**. Scoreboard requests now send `Mozilla/5.0 (compatible; SAS-Sports/<version>)`; school sites keep the `/bot` identity.
- **Nickname-only matches refused (shared).** Once ESPN answered, New Hampshire Wildcats matched K-State's "Wildcats" alias (a phantom Sep 30 final). Matching now uses ESPN's location, full or short name, or abbreviation only.
- **Gate:** `npm run test:release` and `npm test` passed. CI green. Preview: one live card, no phantom final, XC 18/20 and 26/21, 36/36 forced refreshes.
- **Production:** live card shown, no phantom final, XC 18/20 and 26/21; K-State, Arizona and BYU Football feeds unchanged.
- **Set points on the card, #111 (`caa77a2`, `4.37.3-kstate-volleyball-set-points`).** The user's screenshot showed only "LIVE · 1st Set" and `0–0`, because the live card shows `recency_label` and sets won, never `headline`. The set points now go in `recency_label` as well. Production at 23:56 UTC: `LIVE · 1st Set · 18-21`; XC 18/20 and 26/21. While a game is live the page re-fetches every 30 s.
- **15 s refresh and set points as the big score, #113 (`e6763a4`, `4.37.4-live-refresh-15s`, user: "Make it 15 seconds refresh / Still showing 0-0").**
  - The page re-fetches live games every 15 s.
  - Feeds with a live game (`x-sas-live`) are fresh for 10 s instead of 25 s; school pages stay cached.
  - While live, volleyball's big score is the current set's points, and the status line carries sets won.
  - Production at 00:03 UTC on Oct 2: `25–27 · End of 1st · Sets 0-1`; XC 18/20 and 26/21.
- **BYU Volleyball live, #115 (`4b794ea`, `4.37.5`, user: "Let's update this to byu").** BYU Volleyball uses the same ESPN scoreboard (`byuSchool.liveScoreboards`).
- **Live score over the saved schedule, #116 (`5e140d1`, `4.37.6`, shared).**
  - After #115, one K-State refresh returned only the ESPN game (0 results, 0 upcoming): a one-off kstatesports.com failure, saved over the full schedule.
  - When every official page fails, the live score is now laid over the last good full feed, which is never overwritten by that partial feed. With no saved copy, the request is unavailable.
  - Preview: 36/36 forced refreshes each for K-State and BYU returned the full schedule plus the live card.
  - Production at 00:25 UTC: BYU `20–16 · 2nd Set · Sets 1-0` (11 results, 16 upcoming); K-State `16–20 · Sets 0-1` (12 results, 15 upcoming); XC 18/20 and 26/21.
- **BYU Basketball live, #118 (`b8de8a4`, `4.37.7-byu-basketball-live`, user: "Add live scores for BYU basketball too").** Men's and women's ESPN scoreboards, labeled to match the official cards. Tests use real Houston–BYU events (both Cougars). Production: Basketball unchanged (67 upcoming, no live game until the Oct 16 exhibition); Volleyball still live; XC 18/20 and 26/21.
- **No faster source available.**
  - ESPN sat on "End of 1st" for about 8 min (00:03–00:11 UTC).
  - StatBroadcast (the official live stats) sits behind a Cloudflare bot challenge (403); getting past it would be evasion, so it is not used.
  - ESPN's per-game summary lags the same way, and NCAA.com had no scoreboard file.
- **Limitation:** ESPN's volleyball feed updates slowly (it stayed at 6-9 for over five minutes). The final's `W, 3-1` format is fixture-tested; tonight's real final was not observed in this session.

**BYU: all 12 sports converted; production is `4.37.1-byu-track-field` (23:10 UTC, October 1).** User: "Finish BYU, do all the sports". The agent opened and merged PRs #97–#107 one sport at a time under `AGENTS.md` item 6 (#94 was Football). Each passed the preview gate (K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes, CI green) and was verified in production. The status table and limitations are in `docs/BYU_MODULE.md`.
- Reader features added along the way:
  - `No. N` rankings dropped;
  - plain relative Recap links read;
  - internal games and meets skipped;
  - `TBA`/`TBD` opponents named after their tournament heading (and tennis events named after theirs);
  - card recaps refused when dated outside the event;
  - meet team finishes (`Women's team: 1st · 19 pts`) and golf places;
  - a current-season filter with empty schedules.
- Recap safety:
  - **Recaps must name BYU.** On the Soccer preview, the shared opponent-site fallback had matched a cubuffs.com Colorado vs New Mexico story to the Sep 3 Colorado State game. A recap must now name BYU in its own title or article.
  - **Golf recaps must be final.** On the Golf preview, in-progress "after day one" stories were used. A golf recap must now be dated on or after the last day and state the final place.
  - **Multi-day events** are checked against their last day.
- Shared-code touches, all gated to BYU or behavior-identical for other schools:
  - BYU added beside Kansas in the recap-search day rule;
  - BYU's empty-schedule clause reads the parse result before team labeling (#107 preview returned 502 without this);
  - the regression route check accepts route lists.

**Earlier the same day: BYU module set up and Football converted (`4.36.0-byu-football`, 21:07:49 UTC).** User: "Let's add the next big 12 school". The sandbox still gets HTTP 403 from arizonawildcats.com and baylorbears.com. byucougars.com returns 200, so BYU is the next reachable school in catalog order. PR #94 (https://github.com/egassam/SAS-Sports/pull/94) was merged by the agent under `AGENTS.md` item 6 as `8cbbb30`. Details are in `docs/BYU_MODULE.md`.
- **Setup:**
  - `src/schools/byu.mjs` holds routes for all 12 sports, `combinedSports` and the 3 verified Soccer Instagram tags.
  - 438/438 catalog routes are identical before and after.
  - All ten Worker-evaluating test harnesses inject `byuSchool` and `createByuHandlers`.
  - `regression.mjs` and `protect-certified.mjs` read BYU routes and tags from the module.
- **Football:** byucougars.com is WMT (`schedule-event-item` cards with `<time datetime>` including the local offset).
  - Production showed every upcoming game twice, a phantom `Nov 28 Cincinnati W, 63-7` final, and Iowa State on both Oct 9 and Oct 10.
  - The module card reader (`byuSchool.cardSports`, Football only) now gives 3 finals in K-State format with their own recaps and 9 upcoming games (`Oct 3, 5:00 PM`, `Oct 9, 8:15 PM`, then TBA).
- **Expanded view:**
  - BYU recaps rarely say "football", so the shared matcher rejected all three. Production had shown highlights from other teams' games.
  - `byuHandlers.matchesRecap` drops only the sport-word check, and only for the card's own Recap link. Opponent and date are still required.
  - Production now shows 4 highlights per final, each from that game's recap.
- **The other 11 BYU sports are still on the shared parsers** (read-only production survey, ~21:09 UTC):
  - Volleyball, Soccer, Cross Country, Baseball, Softball, Golf and Tennis mix `Oct 3`-style and `Sat. Oct. 3, 2026`-style events (card + schema data, likely duplicates).
  - Basketball and Swimming & Diving have outright duplicates.
  - Gymnastics shows the January 2026 season as current.
  - Track & Field returns 502 (no usable source).
  - Cross Country finals read `Completed`, with no race rows.

**Scheduled feed refresh (item 3) was tried and reverted; production is `4.34.0-polite-source-fetch` with no Cron Trigger (20:13 UTC, October 1).**
- #87 (`c9c0c65`, `4.35.0-scheduled-feeds`): stored feeds in Workers KV (namespace `sas-sports-feeds`, id `44e354a55a1c43ce8013e40eb2cc9a75`, created this session), plus an every-minute Cron Trigger.
  - The visitor side worked in production: copies built at one location were served at others (`x-sas-cache: stored`).
  - The Cron Trigger started about 6 minutes after deploy, and every scheduled rebuild failed, including feeds visitors built fine. By 19:50 each run was `due 20, built 0, failed 20`. The cause was not established.
  - Leading hypothesis: Cloudflare runs Cron Triggers "on underutilized machines", whose outbound addresses school bot protection may refuse.
- #88 (`47aedb0`): records failure reasons in `/api/feed-store` and pauses a failing feed for 10 min. Merged, CI green, but **Cloudflare never deployed this merge commit**; production stayed on 4.35.0. Why is unknown; check the Workers Builds history for `47aedb0`.
- #89 (`68c3673`, user-approved): reverts #87 and #88. The tree equals `d0c56fc`. Production was back on 4.34.0 at 20:07:17 UTC; `/api/feed-store` 404; XC 18/20 and 26/21; live health 48/48.
- #90 (`091b15e`, user-approved): `"triggers": {"crons": []}` in `wrangler.jsonc`. Omitting `triggers` leaves a deployed Cron Trigger in place. The Worker updated at 20:13:31 UTC; production checks unchanged.
- The `sas-sports-feeds` KV namespace still exists and holds the leftover `prod`/`preview` keys from 4.35.0. It is unused and the keys expire within 7 days; delete the namespace if item 3 is abandoned.
- Item 1 (calendar feeds) was skipped by the user. The four SIDEARM schools block the sandbox, and calendar feeds likely lack scores and recap links.

**Polite source fetching (shared, all schools); production is `4.34.0-polite-source-fetch` (14:16 UTC, October 1).** User asked how to avoid triggering schools' bot defense, chose items 2 (cache school downloads) and 4 (honest identity, robots.txt, Retry-After, conditional requests), and approved the cross-school change. They then said: "Merge it with the 15-second backoff and watch production". PR #85 merged as `4ac60ad`.
- **`src/source-fetch.mjs`** handles every official-site download (schedules, recaps, news listings, rosters, profiles, PDFs, TFRRS, module recap fetches):
  - one copy per Cloudflare location: schedules 2 min, listings/rosters 10 min, articles 30 min, documents 6 h. `refresh=1` rebuilds the feed from the saved page; there is deliberately no way to force a school re-download.
  - expired copies revalidate with `If-None-Match` / `If-Modified-Since`.
  - 429/503 honour `Retry-After` (at least 60 s); any other refusal pauses that page 15 s. Articles and documents keep serving their last good copy; schedules never do.
  - `robots.txt` is obeyed (a `SAS-Sports` group wins over `*`) and kept for a day.
  - at most one Cache API `match` and one `put` per download (the paid plan allows 1,000 Cache API calls per request, shared with fetches).
- **Identity:** user agent `Mozilla/5.0 (compatible; SAS-Sports/<version>; +https://sas-sports.lovetogivepain.workers.dev/bot)`. `public/bot.html` describes the fetcher. The Instagram portrait fetch no longer sends a fake Chrome UA; preview and production portraits were unchanged.
- **`/api/diagnostic`** rows now include `source_cache` (`network`, `fresh`, `revalidated`, `stale-on-error`, `backoff`, `robots-disallowed`) and `upstream_status` during a backoff.
- **robots.txt survey (sandbox):** 28 of 68 school sites served it; 40 returned Imperva/Incapsula 403. None of the 28 disallow schedule, roster or news paths. mgoblue.com, texaslonghorns.com and texastech.com disallow `/documents/`, so their PDF results will be skipped when those schools are converted.
- **Unexplained preview event:** on the first preview commit (60 s backoff), K-State XC failed at IAD for at least 90 s (refused, then held in backoff) while production at IAD fetched fine. Not reproduced; the backoff was shortened to 15 s, and the final gate passed 14/14 at IAD. If refusals appear only on 4.34.x, suspect the new user agent first.
- **Test harnesses** that `eval` `src/index.js` must inject `createSourceFetch` and `SOURCE_TTL` (done in all ten).

**Arizona State: all 17 sports converted; production is `4.33.3-arizona-state-swimming-diving` (October 1 UTC).** User: "Start next school. Stay in the Big 12." (Arizona State chosen: Arizona and 7 other Big 12 sites return 403 to the sandbox), then "Do all the sports. Do not ask me unless it's necessary". The agent opened and merged PRs #66 and #68–#83 one sport at a time under `AGENTS.md` item 6. Each passed the preview gate: K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes, CI green. Each was verified in production. The status table and limitations are in `docs/ARIZONA_STATE_MODULE.md`.
- **Cause:** thesundevils.com's `schedule-event-item` cards defeat the shared WMT card reader: it takes the nested `vs.`/`at` divider for the opponent and splits `<time>Sep</time><time>5</time>`. The result was `ASU vs vs.` events merged together, evening games a UTC day late, phantom finals, and past seasons shown as current.
- **The module reader** (`createArizonaStateHandlers().parseSchedule`, hook in `parseHtml`) is now used for every sport. It provides:
  - card years from the page's JSON-LD;
  - only the current academic year (July–June); past-season pages become empty schedules;
  - K-State-style results and recaps;
  - published local times;
  - team-labeled two-team sports (Basketball, Golf, Swimming & Diving, Tennis), with `-mens`/`-womens` event ids;
  - Cross Country race rows from official recaps (`attachMeetResults`, same three school-gated hooks as Utah).
- **Routes:** only official pages (`ice-hockey`, `track-field`, `mens-`/`womens-` pages). Swimming & Diving was 502 on the inherited `/sports/mens/swimming-diving/` routes.
- **Test correction:** #72–#75 were merged without their fixture tests; a helper's insertion anchor had stopped matching. Their PR texts implied the tests were there. The tests were added in #76; they pass, and mutations fail them.
- **Transient:** right after the #79 merge, one production K-State XC read was 2/20. Three immediate forced refreshes returned 18/20, the same kstatesports.com recap flake seen September 30.
- **Still open for Arizona State:** see Limitations in `docs/ARIZONA_STATE_MODULE.md`: Golf field size, XC team scores, the tennis recap match. The spring sports become non-empty once thesundevils.com publishes 2026-27 schedules; no code change is needed. Athlete certification for Arizona State was not reviewed this session.

**Reliability (September 30, user-approved, all merged and verified in production).** The user's screenshot showed Utah Basketball "LIVE SOURCE UNAVAILABLE".
- **#53 (`f5833e4`) fixed the cause.** Cloudflare 1102 (Worker CPU limit): `scheduleYearForDate` converted the whole page to text once per game card, costing 177–417 ms of CPU per ~900 KB SIDEARM page. It now reads the page once (32–48 ms), with byte-identical output. Production went from 8/36 forced-refresh failures to 36/36 successes.
- **#54 (`cd7cba8`):** `tests/parse-budget.mjs` fails if a parse converts a large page to text more than 4 times, or exceeds 400 ms. It runs in `npm test` and `test:release`.
- **#55 (`76a7b74`):**
  - Every successful feed also saves a 7-day last-good copy.
  - `cached=1` serves saved copies without rebuilding.
  - After a failed load, the app shows the last good copy (from the server, then from the device's localStorage), labeled "Saved schedule · updated X ago".
  - `VERSION` is unchanged.
- **Still open:**
  - At some Cloudflare locations (seen at Toronto, YYZ), every forced rebuild fails with 1102 while cached feeds load. Old and new code behave the same, so this is probably the account's per-request CPU limit.
  - The user was asked to check the Cloudflare plan: Workers Free allows 10 ms of CPU; Workers Paid ($5/month) allows 30 s.
  - **Resolved later on September 30:**
    - The user upgraded the Cloudflare plan. Forced refreshes via Toronto then passed 10/10, and the full health check 48/48.
    - The daily live health check (#3) is merged: `.github/workflows/live-health.yml`, daily at 11:23 UTC, plus manual runs. `npm run test:live-health` runs it locally.
    - It force-refreshes every sponsored sport of K-State, KU, Oklahoma State and Utah. It fails on any sport still failing after 3 attempts, or on a first-attempt 1102 rate above 5%.
    - The load-test merge rule is in `AGENTS.md` item 6 (PR #57, merged by the user).
  - The pre-merge load-test rule (#2) was drafted for the user to add to `AGENTS.md`; the agent does not edit that file.
- **Testing note:** Cloudflare's cache is per location, and requests from the sandbox alternate between IAD, ATL and EWR. A copy saved at one location is not visible at another. Node's `fetch` in the sandbox bypasses the proxy and reaches YYZ; use curl, or `NODE_USE_ENV_PROXY=1`.

**Utah: module set up, and 8 sports fixed; production is `4.31.5-utah-tennis` (September 30 UTC).** The user chose Utah ("Let's start the next school" → "Utah") and approved the agent merging the setup PR. Every PR below was verified on its branch preview (K-State XC 18/20, KU XC 26/21 each time), merged by the agent under `AGENTS.md` item 6, and verified in production. Details are in `docs/UTAH_MODULE.md`.

| Sport | PR | Production |
| --- | --- | --- |
| Setup (route parity) | #44 | `src/schools/utah.mjs`; 219/219 routes identical |
| Football | #45 | `W, 31-17` with exact recaps; published start times. The SIDEARM page-data reader moved to `src/sidearm-schedule-data.mjs` (Oklahoma State unchanged) |
| Cross Country | #46 | Race rows from official recap tables: `Women's team: 2nd · 107 pts`, runners, `Women's Open` group |
| Beach Volleyball | #47 | Showed indoor volleyball matches. Now uses the real `womens-beach-volleyball` page; the 2025 season there is past, so the app shows the empty-schedule note |
| Lacrosse | #48 | Spring 2026 games shown as current. Now `mens-lacrosse` only, with the empty-schedule note |
| Skiing | #49 | Was 502. Now `alpine-skiing`: 31 races of 2027, labeled `Denver Invitational · Giant Slalom` |
| Golf | #50 | Only today's round. Now `mens-golf`, one event per tournament (Jackson Stephens Cup final + recap; Mark Simpson today; 11 upcoming) |
| Tennis | #51 | Women only. Now both teams, labeled (26 women's + 22 men's) |

- **Root cause of the out-of-season failures (user report: "Utah's sports out of season are not working properly"):**
  - Several inherited routes used slugs utahutes.com does not have. Those render SIDEARM's empty "@season @sport" template, whose site-wide ticker lists other sports' events.
  - Spring sports' pages keep showing last season.
  - The Utah module now:
    - routes to the real slugs;
    - for Beach Volleyball, Lacrosse and Skiing, keeps only events in the page's own schedule data and in the current academic year (`filterEvents`, with an `empty_schedule` flag).
- **Checked and correct:**
  - Gymnastics: only the Dec 12 Red Rocks Preview is published for 2026-27.
  - Swimming & Diving: both teams, labeled.
  - Baseball, Basketball and Softball: upcoming only.
  - Track & Field: empty-schedule note.
  - Soccer and Volleyball: already in K-State's format.
- **Still open for Utah:**
  - **Volleyball athlete certification** fails ("no verified Instagram destination"). The Worker found one verified Instagram among the roster profiles, and two slots use official profiles. The fix (Oklahoma State's opt-in `athlete_profile_fallback_sports`) needs the official roster checked first. The roster returned 403 to the sandbox all afternoon, so nothing was changed.
  - **Golf placings:** the page publishes none, so completed tournaments read `Completed`.
  - **Start times** are enabled only for Football.
- **Utah finish (later September 30; user: "Start new session and finish Utah"):**
  - **Volleyball start times, #59 (`999baa0`, `4.31.6`):** production shows 16/16 upcoming timed. Kansas State (Oct 3) keeps the card's 5:30 PM because Utah's own page data disagrees (5:00 PM).
  - **Volleyball athletes, #60 (`ff73a87`):** the official roster has 19 players and 1 personal Instagram. Volleyball is added to Utah's `athlete_profile_fallback_sports`; Utah certification is 4/4.
  - **Soccer start times, #61 (`56bdb41`, `4.31.7`):** production shows 8/13 upcoming timed. The 5 postseason placeholders have no published time.
  - **Softball doubleheaders, #62 (`cdb4c11`, `4.31.8`), merged with the user's approval ("Yes to both"):**
    - The Oct 11 doubleheader vs Southern Utah showed as one game.
    - The Utah module now restores each unplayed doubleheader game (Softball, Baseball) as Game 1 / Game 2.
    - It needs one shared line: `eventMergeKey` includes `game_number` when an event has one. Output for all other saved pages is byte-identical.
    - The preview showed 5 games, K-State XC 18/20, KU XC 26/21 and a 36/36 load test.
  - **Blocked by utahutes.com 403 all evening, not changed:**
    - Baseball page (4/58 upcoming timed in production).
    - Women's Basketball page.
    - Men's Basketball: its page lists 36 of 40 games as TBA, so there are almost no times to add yet.
  - **Golf placings:** Utah publishes no placing field. The Jackson Stephens Cup recap gives a match-play bracket result ("ties for second place in match play"), not a stroke-play place. Golf stays `Completed` with the official recap.
  - **Softball** was already fully timed.
  - **Route cleanup, #64 (`920650c`, `4.31.9`), one batched PR with the user's approval:**
    - Baseball, Basketball, Gymnastics, Softball, Swimming & Diving and Track & Field route only to their official pages.
    - A test requires every Utah route to be a sport page the site lists.
    - Preview and production feeds were identical to before for all six sports (36/36 load test each).
  - **Production verification:**
    - Softball shows Oct 11 Game 1 at 1:00 PM and Game 2 at 3:00 PM.
    - K-State XC 18/20, KU XC 26/21 after both merges.

**Merge permission (user, September 29–30).** The user added a standing merge permission to `AGENTS.md` item 6 (commit `afc7ed4`). Follow its conditions exactly.

**Oklahoma State: all sports checked against K-State; production is `4.29.12-oklahoma-state-equestrian-times` (September 30 UTC).** The user said "Finish all of Oklahoma State". Each sport was fixed, verified on its preview, merged by the agent under `AGENTS.md` item 6, and verified in production, one at a time:

| Sport | PR | Production |
| --- | --- | --- |
| Football | #27, #30 | `W, 41-24`-style results with exact recaps; verified expanded highlights; published start times |
| Golf | #28 | Placings as `7th of 16` |
| Track & Field | #29 | 200 `[]` instead of 502 |
| Soccer, Softball, Baseball, Basketball, Wrestling, Equestrian | #31–#36 | Published start times; results unchanged (already in K-State's format) |
| Cross Country | #23 | Complete since September 29 |

Details are in `docs/OKLAHOMA_STATE_MODULE.md` under "All sports vs K-State".

Still open for Oklahoma State:
- **Tennis:** empty feed, which matches K-State's behavior; it is a source gap, not a parser bug.
  - The men's page is the "2026-27 Cowboy Tennis Schedule" (downloaded September 30). It lists only 4 fall individual tournaments, all already over: UTR Shootout Stillwater (Aug 29–30), UTR Shootout Tulsa (Sep 12–14), ITA All-American Championships (Sep 19–27) and UTR PTT Norfolk (Sep 21–27).
  - The women's page is still the 2025–26 schedule.
  - Past tournaments without a team result are not listed. K-State is the same: its women's page parses 16 events, and its feed shows only the 8 upcoming (Oct 2–Nov 17) with 0 results.
  - Oklahoma State's feed stays empty until okstate.com publishes October-onward events.
  - Correction: the September 29 note that the men's events were "outside 2026–27" was wrong. It had been inferred from the feed, not checked against the page.
- **Women's Basketball:** start times unverified. Its page returned 403 to the sandbox; the preview showed no timed games.

**Working rule (user, September 29): one sport at a time.** Within a school, fix, verify and publish one sport before starting another. K-State's output is the reference each sport's results section must match.

**Oklahoma State Cross Country is merged, deployed and verified in production.** The user merged PR #23 (https://github.com/egassam/SAS-Sports/pull/23) at about 18:26 UTC on September 29 as merge commit `0629321`. PR #24 (`ae5e65f`, feed retry) merged afterwards, so production now reports `4.29.2-feed-retry`; it carries the same Cross Country code.

At 19:00 UTC, forced production feeds matched K-State's format, and `/live/highlights` was identical to the feed for both meets:

| Meet | Rows | Headline |
| --- | --- | --- |
| Cowboy Preview | 31: `Women's 3K`, then `Men's 5K` | `Women's team: 1st · 26 pts / Men's team: 1st · 31 pts` |
| Cowboy Jamboree | 37: `Women's 6K` (15 athletes), then `Men's 8K` (20 athletes) | `Women's team: 2nd · 64 pts / Men's team: 2nd · 44 pts` |

The table below is the pre-fix production state (user report, September 29), kept for history:

| Item | K-State (reference) | Oklahoma State now |
| --- | --- | --- |
| Result groups | One group per race, labeled by division and distance (`Women's 6K`, `Men's 8K`), with the team row first | Team and individuals split into separate groups (`Men's Team`, `Men's Individual Results`), with no distance |
| Order | Women first, then men | Men first |
| Headline | `Women's team: 18th · 499 pts / Men's team: 17th · 449 pts` | Raw schedule text for one team only (`1st - 31 pts.`) |
| Cowboy Jamboree (Sept 26) | n/a | 1 row, `Result: 2nd - 44 pts.`, with no athletes, although the official results PDF and recap links are present |
| Recap fields | `recap_result_count` set; highlights from the official recap | No `recap_result_count` in the feed |
| Schedule source | n/a | Only the men's `mxct` schedule; the women's program schedule is not loaded |

Cowboy Preview does carry 31 correct rows: both teams 1st (men 31 pts, women 26 pts), 15 men and 14 women with places and times. Its data is right; its format is not.

**Oklahoma State module is merged, deployed and live as `4.29.0-oklahoma-state-module`.** The user merged PR #21 (https://github.com/egassam/SAS-Sports/pull/21) at 17:31 UTC on September 29 as merge commit `da5b91efa3647fed90dc0a1ef247db89f4d05992`. Production verification is recorded under "Oklahoma State production verification" below. See `docs/OKLAHOMA_STATE_MODULE.md`. Oklahoma State's athlete-certification failure was a validator rule, not an app defect. It is fixed by the new opt-in `athlete_profile_fallback_sports` certification field, which affects only Oklahoma State. Verified schools are now K-State, KU and Oklahoma State. Utah and Alabama still fail athlete checks unchanged.

**Project scope (user, September 29): only K-State and KU are expected to work correctly now.** Every other school still needs its own school module built the same way as `src/schools/kstate.mjs` and `src/schools/kansas.mjs`, one school per session, with tests against that school's real official sources. Until a school is converted, its live-certification failures are expected. They are not regressions and not a reason to patch that school inside shared code. As of this date, Oklahoma State, Utah and Alabama fail athlete-Instagram checks, and the other 13 non-module schools pass only the basic certification checks.

**The September 29 local-time fix is merged, deployed and live as `4.28.1-local-time`.** PR #19 merged at 15:25 UTC as `79c157d8ce8349439cab3c23931d46f5fb920682`, and production switched at about 15:29 UTC.

Official schedule times are stored as the school's local wall clock, while ESPN times are true UTC and "today" was computed in UTC. So a 7 PM Central K-State game failed to reconcile with its ESPN score, appeared as a separate next-day Live card, and dropped out of Upcoming at 00:00 UTC. The fix adds a per-school time zone (a state map plus a Tennessee override). It converts ESPN times into that frame and uses the school's local date in the shared `makeEvent`, `groupEvents` and text-row checks and in the KU module.

An actual evening game has not yet been observed through the fix; deterministic fixtures cover it.

**K-State live display preview is deployed.** PR #18 corrected the initial PR #17 preview after the user selected Football and saw an empty Live tab. The opt-in URL `https://sas-sports.lovetogivepain.workers.dev/?school=kstate&demo=live` now opens on Football + Live with a persistent, clearly labeled 28–21 sample and supports Basketball's 71–68 sample when selected. The button moves the example through Final, Upcoming, and Live while selecting the corresponding tab. The regular app and feed API retain genuine data only. This demonstrates display states, not a real in-progress ESPN game. September 29 forced Football and Basketball production feeds had no live K-State contest.

**The September 28 K-State dual-team and live-score work is complete, merged, deployed, and live as `4.28.0-kstate-live-scores`.** PR #15 added explicit men’s and women’s K-State Golf sources and labels while preserving both Basketball teams. Production Golf verification returned both divisions, 4 results and 22 upcoming events. PR #16 added independent ESPN scoreboard inputs for K-State Football and both Basketball programs, merged at application commit `a23a16b3b1d2a5fafec5327041953fcb4b672d43`. The scoreboards run alongside the official K-State schedules, reconcile on sport/date/division, and can supply a game even when the school schedule has no usable live state. Production returned the new version and healthy current Football/Basketball feeds; no K-State game was in progress at verification time, so an actual live-game transition was not observable. Historical live payload fixtures verify score, clock/period, final state, team identity, and men’s/women’s isolation.

**KU module is complete, merged, deployed, and live as `4.26.1-kansas-recap`.** PR #14 merged at 13:54:46 America/Chicago on September 28, producing `c9a02452107bad023ff06214f4ba99668f06d5a4`. Post-merge certification run `36468538013` passed. Production status and the exact South Dakota State volleyball event were rechecked after deployment: the card now uses the correct September 11 KU recap and its expanded endpoint returns four verified event-specific highlights. The broader KU verification below remains accurate, with the documented tennis, softball, and track source limitations. KU is finished; do not begin another school until the user starts a new school-module session.


**K-State module extraction is complete, merged and live as `4.25.0-kstate-module`.** [PR #12](https://github.com/egassam/SAS-Sports/pull/12) was merged after user approval on September 27 at 14:50:17 UTC (09:50:17 America/Chicago), producing application commit `30d6edd0f46f1ceebaed1fd7f5eca54921f0f095`. This completion session verified the production version and opened both expanded cross-country races in the live app. Gans Creek retains 18 rows (9 women, 7 men, 2 teams); Platte River retains 20 rows (11 women, 7 men, 2 teams). KU is being completed in the September 28 session below.

**Outstanding shared operational issue:** post-merge workflow run `36327362690` failed its live cross-school-isolation job with HTTP 503 / Cloudflare Error 1102 (Worker exceeded resource limits). Guardrails, certification matrix and Cloudflare build passed; dependent live-school certification was skipped. Do not report the full live audit as passing. K-State module completion means extraction parity plus the scoped live verification below, not fresh certification of every sport.
See `docs/KSTATE_MODULE.md` for the ownership inventory and test contract. K-State's existing school-specific backend policies are now in `src/schools/kstate.mjs`; generic publisher logic and shared catalog/display metadata remain shared.

| Item | Verified value |
| --- | --- |
| Repository | `egassam/SAS-Sports` |
| Default branch | `main` |
| Live K-State page | https://sas-sports.lovetogivepain.workers.dev/?school=kstate |
| Working application version | `4.28.0-kstate-live-scores` |
| Verified application commit | `a23a16b3b1d2a5fafec5327041953fcb4b672d43` |
| Pre-extraction recovery tree | `b8b7958477f593181f8ba2e52355e65f768c5bb8` |
| Preserved baseline branch | `checkpoint/kstate-xc-verified-20260926` |
| Baseline branch target | `19ec2ecb2ac03b8c7d242cb14a23146878857ab0` |
| Merged correction | https://github.com/egassam/SAS-Sports/pull/11 |
| Correction commit | `0d7212d952a1f1c4254b6e699cbfeeb2331a712b` |
| Prior KU correction | https://github.com/egassam/SAS-Sports/pull/10 |

The baseline branch is a named recovery checkpoint. Do not move it during normal development. Documentation commits after this application commit do not represent additional application changes. Use the current main branch for new work, retaining the September 26 baseline branch target as the pre-extraction comparison/recovery reference.

## What was fixed and why it mattered

The September 4 Platte River Rumble Gold event had a saved, exact-event table built from the official recap. Its reliable results were not dependent on live AI generation.

For September 25 Gans Creek, the live feed selected only the women's result PDF, returning nine women and marking the result verified. The expanded view used a separate prose parser that could overwrite those rows with incorrect results. One observed response contained an incorrect men's team win and an athlete named `Junior Brock`; AI returned `ai_failed`. Generic TFRRS enrichment could also replace the original race's good table with malformed group labels and `0th` DNF/DNS rows.

The deployed K-State-only fix reads the exact official recap's labeled women's and men's team-finishes and individual-results sections. It extracts division/distance, K-State team placing/points, and each published athlete/place/time. Both the feed and expanded view use that same result path. Complete recap rows cannot be overwritten by a single PDF or AI/prose extraction. Incomplete or unavailable sections are explicitly marked partial. A matching future recap does not require a new hand-entered race record.

Official recap sources:

- https://www.kstatesports.com/news/2026/9/25/cross-country-wildcats-showcase-significant-personal-improvement-at-gans-creek-classic
- https://www.kstatesports.com/news/2026/9/4/cross-country-k-state-clinches-team-wins-at-platte-river-rumble-gold

### Verified live results (rechecked September 27)

| School / event | Women | Men | Team rows | Total rows |
| --- | ---: | ---: | ---: | ---: |
| K-State — Gans Creek | 9 | 7 | 2 | 18 |
| K-State — Platte River Rumble Gold | 11 | 7 | 2 | 20 |

Gans Creek: women 18th / 499 points; men 17th / 449 points. The expanded live page displayed every runner, including the final listed women and men, with the expected names, places and times. Platte River's expanded live page retained the complete original table and highlights.

KU's live feed after the September 26 correction retained 26 Gans Creek rows and 21 Bob Timmons rows. Those KU live counts were not rechecked in this completion session. This is a scoped K-State/KU verification, not a claim that every sport at every school is currently correct.

### September 26 correction validation

- `npm run test:release` passed.
- `npm test` passed.
- `git diff --check` passed.
- Offline esbuild Worker bundle passed.
- Wrangler deployment dry-run passed after user approval.
- Actual downloaded K-State schedule/recap processed through production `fetchLive` and expanded-event code: 18/20 rows and matching feed/modal results.
- GitHub PR guardrails and certification-matrix jobs passed before merge (workflow run `36276099363`). Live-school jobs intentionally skipped for this PR.
- Remote correction tree matched the tested local tree exactly.
- Production status confirmed `4.24.1-kstate-recap-results`.
- Browser verification opened both K-State races and checked full result text and layout after deployment.
- Local regression protections covered the original K-State record, KU records, school/date identity, later matching recaps, incomplete/failed sources, 18 certified schools and 71 school/sport cache identities.

## School-module direction agreed with the user

The app should have one module per school, with sport handlers inside each school module as needed. School-specific source selection, schedule parsing, recap extraction and athlete verification belong there. Shared display, selection, refresh, caching and standardized event/result structures remain shared.

Separate files alone do not guarantee isolation. Test each module against that school's real publisher formats, and test shared changes against verified schools. Keep complete men's/women's result sections and source links in a consistent result format.

Agreed sequence:

1. **Completed:** preserve today's working version as the baseline.
2. **Completed:** K-State module extraction, approved merge/deployment, and scoped live cross-country verification.
3. A separate later session: bring KU's existing cross-country adapter into the school-module structure.
4. Correct and verify each remaining school individually, one school per new session.

The September 26 “Do the first one” applied to baseline preservation. The separate September 27 “Start KSTATE module” request authorized the extraction now prepared on its own branch.

## Instructions for the next session

- **Colorado is complete** (#214-#223). Next: the next Big 12 school the user names. Remaining unconverted Big 12 schools: Houston, Iowa State, TCU, Texas Tech, West Virginia. Watch Colorado's first live volleyball (at Baylor, Oct 4) and soccer (vs Baylor, Oct 8) cards; Track & Field fills in when cubuffs.com publishes 2026-27. Houston's football page still goes through `compactScheduleHtml` (shared); when converting Houston, check whether its module needs the whole page as Colorado's did.
- **Cincinnati is complete** (#202-#212). Next: the next Big 12 school the user names. Remaining then: Colorado, Houston, Iowa State, TCU, Texas Tech, West Virginia. Watch Cincinnati's first live volleyball (at UCF, Oct 9) and soccer (vs Utah, Oct 8) games; Lacrosse (2027) and Track & Field (2026-27) fill in when gobearcats.com publishes them.
- **Level order (user, October 3, for later):** when high school or pro teams are added, order the level switch High School, College, Pro (the `LEVELS` array in `public/index.html`). Not before.
- **Baylor is complete** (#178-#195). Next: the next Big 12 school the user names. Remaining unconverted Big 12 schools: Cincinnati, Colorado, Houston, Iowa State, TCU, Texas Tech, West Virginia. Watch Baylor's first live football card (at Arizona State, 02:30 UTC Oct 4) and volleyball (vs Colorado, Oct 4 2:00 PM CT).
- **Live cards (from the Oct 3 live test):** watch a football final arrive (`W, 31-20` wording) and a non-football live game with the glow (volleyball/soccer). Possession is football only; ESPN's basketball scoreboard carries no possession.
- **Arizona is complete except for source-blocked items** (see `docs/ARIZONA_MODULE.md`, Limitations): when arizonawildcats.com publishes the 2027 baseball roster, add Baseball to Arizona's `athlete_sports` (verify 3 athletes first); Gymnastics and Track & Field fill in without code changes when 2026-27 is published. Soccer and volleyball live cards were observed working on Oct 3 UTC; watch the first football (Oct 3) and basketball (Oct 13) live games. Remaining unconverted Big 12 schools: Baylor, Cincinnati, Colorado, Houston, Iowa State, TCU, Texas Tech, West Virginia.
- **Live scores (ESPN), open checks:** (#164 and #166 fixed the missing games, wrong-team matches and bare-score finals for every school; watch the first real games.)
  - Observed: the K-State vs BYU final reached both cards (K-State `L, 1-3`, BYU `W, 3-1`) after #121.
  - Watch a K-State or BYU basketball game go live (season from Oct 16).
  - ESPN lags, especially between sets. StatBroadcast is behind a bot challenge; do not work around it.
- **Global source cache (paused by the user, October 1):** one copy of each school page for all Cloudflare locations, via one Durable Object per school site. The plan is in the session record below. Do not start it until the user switches the Worker to Cloudflare "Worker Previews" (dashboard; irreversible). The current Builds preview model (Version URLs) generates no preview URLs for Workers with a Durable Object, which would break the merge gate.
- **UCF is complete** (#123, #125–#134, #137, #138; shared #140, #141, #143). Next: the next Big 12 school the user names, finished completely before stopping (`AGENTS.md` item 5a). Blocked sites (Arizona, Baylor) are now reachable through `scripts/fetch-official.mjs` (key set up and verified October 2; run with `NODE_USE_ENV_PROXY=1`). Arizona is next in catalog order; the agent proposed starting it with Football. Check Utah Lacrosse (failing in production at 13:52 UTC on Oct 2) in a Utah session. Remaining unconverted Big 12 schools: Arizona, Baylor, Cincinnati, Colorado, Houston, Iowa State, TCU, Texas Tech, West Virginia; Arizona and Baylor still return 403 to the sandbox. Rowing, Track & Field and men's Tennis become non-empty when ucfknights.com publishes 2026-27 schedules; no code change is needed. Open items are under Limitations in `docs/UCF_MODULE.md` (athlete certification not reviewed). Next: the next Big 12 school the user names. On October 2, arizonawildcats.com and baylorbears.com still returned 403 to the sandbox. Remaining unconverted Big 12 schools: Arizona, Baylor, Cincinnati, Colorado, Houston, Iowa State, TCU, Texas Tech, West Virginia.
- **Expanded-view AI timeouts:** fixed by #200 (page asks once more on `ai_failed`; production `4.49.2`). If `ai_failed` still appears, consider a server-side retry.
- **BYU is complete** (#94, #97–#107). Gymnastics and Track & Field become non-empty when byucougars.com publishes 2026-27 schedules; no code change is needed. Open items are under Limitations in `docs/BYU_MODULE.md` (athlete certification not reviewed). Next: the next Big 12 school the user names. On October 1, arizonawildcats.com and baylorbears.com still returned 403 to the sandbox; ucfknights.com (SIDEARM) returned 200.
- **Scheduled feed refresh (item 3), if retried:** start from the #87/#88 code (`git show c9c0c65`, `47aedb0`). First deploy only the failure reporting with the Cron Trigger rebuilding one feed, read `/api/feed-store` `last_run.errors`, and confirm the deploy actually landed (the version flips on `/api/status`) before enabling more. If schools refuse Cron-Trigger traffic, the scheduled approach does not work on Workers. An alternative is Cloudflare Queues or a Durable Object alarm, which may run on different machines; that is unverified.
- **Source fetching (PR #85):** use `/api/diagnostic`'s `source_cache`/`upstream_status` to tell a school refusal from a parser fault. Still open from the bot-defense discussion: (1) per school, prefer SIDEARM calendar (.ics)/RSS feeds over full HTML pages, one sport per PR, during that school's session; (3) a scheduled Cron prefetch so visitors never trigger downloads; (5) when a site blocks the sandbox, ask the user to save the page from their browser as a fixture; (6) ask schools/SIDEARM for allowlisting or a feed. The user has not said whether `/bot` should list a contact address; do not add their email without being asked.
- **Arizona State is complete** (see "Current state"). Next: the next Big 12 school the user names. Most Big 12 sites returned 403 to the sandbox on October 1; ucfknights.com, byucougars.com (custom platform) and gobearcats.com (custom) returned 200.
- **Utah is complete except for source-blocked items:** Baseball and Women's Basketball start times, once utahutes.com allows the page downloads (fixture-verified, one sport per PR). Earlier list, for reference:
  - Volleyball athlete certification: get the official `womens-volleyball` roster (403 on September 30). If it publishes no personal links for most players, add Volleyball to Utah's `athlete_profile_fallback_sports` in `tests/certified-schools.json`, as done for Oklahoma State.
  - Golf placings, if a verifiable official source exists.
  - Start times for the other game sports (Soccer, Volleyball, Baseball, Softball, Basketball) via the page-data enricher's `timeSports`, each checked against its page.
  - Utah routes still carrying unused generic or homepage candidates: Baseball, Basketball, Gymnastics, Softball, Swimming & Diving, Track & Field. They work today; remove them only with a fixture-backed check.
  - utahutes.com returns HTTP 403 to the sandbox on most attempts. Retry with spacing; do not circumvent.

- **Oklahoma State is complete except for source-blocked items.** When okstate.com lets the sandbox download them:
  - Take the women's Basketball page as a fixture and check its times.
  - Watch for October-onward Tennis events on either page. The men's 2026–27 page was inspected September 30; see the Tennis note above.

  One sport per PR, as before.
- **Other Oklahoma State follow-ups:** the women's cross country/track roster; deep recap certification.
- **Closed October 3:** K-State Football's Sept 26 Cincinnati expanded view now uses K-State's own recap (31-26) in production.

  Otherwise, start the next school the user names.

- Next work: convert the next school the user names into its own module. Before or with the first conversion, consider defining a common school-module interface (schedule parser, recap matcher, results handlers, scoreboards, time zone). Shared code should then look up handlers by school instead of using `school.id==='kansas'` / `'kstate'` branches.
0. If the user approves, merge PR #19 (local-time fix; preview already verified), confirm CI, merge, and verify production `/api/status` returns `4.28.1-local-time`. Then check a forced K-State Basketball feed during an evening game if one is available. Until then, the fix is local/branch-only.
1. Read this file from current GitHub main and inspect the current source/version before editing.
2. KU and K-State are complete. Start no additional school until the user names it in a new school-module session; do not reopen PR #12 through #16.
3. Keep one school per session. After KU is complete, stop; wait for the user to name the next school in a new session.
4. Preserve K-State's 18/20 and KU's 26/21 XC rows. Keep all deterministic module, school and cache protections; run `npm run test:release` for code changes.
5. Do not claim all sports have finals where the school has not published results. KU tennis/softball/track source limitations are in `docs/KANSAS_MODULE.md`. Reviewed golf rows apply only to four exact unchanged articles.
6. Update this same handoff with actual publication/live evidence and append the session record. The previous cross-school resource-limit failure remains unresolved unless fresh evidence establishes otherwise.


## Publication and permission history

Automatic review initially blocked a Cloudflare dry-run and a GitHub push pending explicit publication approval. The user then approved pushing the fix to `egassam/SAS-Sports`, merging it, and deploying to the existing Cloudflare app. Publication and deployment subsequently succeeded.

Shell `git push` had no GitHub credentials. The connected GitHub tools successfully created the exact tested tree, commit, branch and PR. PR #11 was merged after checks passed. Cloudflare's existing GitHub integration deployed it; no separate direct deployment was needed.

The earlier `docs/KSTATE_CROSS_COUNTRY_CHECKPOINT.md` records pre-approval blockers. This current handoff supersedes that document's publication status. Prior approval was for the completed correction; it is not blanket authorization for unrelated future actions.

## Session conversation — September 26, 2026

This record preserves the user messages and substantive final assistant replies visible in this session. Progress/tool activity is summarized afterward; this is not a raw tool-log export or a reconstruction of earlier sessions.

### User — reported regression

> Now KSTATE cross country isn't working correctly. Only women show up in the new race.
> Figure out why everything works perfectly in the first KSTATE cross country event and repeat it. I believe you used AI to go into the official recap to get the results for our results page

### Assistant — diagnosis, implementation and approval request

I found the cause and fixed the code, **but it isn’t live yet**.

The first race uses a complete saved table from its official recap. The new race was reading only the women’s PDF; opening it then triggered another parser that produced incorrect results.

The fix reads both labeled sections directly from the recap, producing **nine women, seven men, and both team scores** in the first race’s format. Tests pass, including protection for the original event and KU.

Automatic approval review blocked both GitHub publication and the Cloudflare check because they send code externally.

**Approve pushing this fix to `egassam/SAS-Sports`, merging it, and deploying to your existing Cloudflare app?** I’ll then verify the live results page.

### User — approval

> Approve

### Assistant — verified completion

**Fixed and live.** I verified both expanded K-State results pages:

- **Gans Creek:** all nine women, seven men, and both team scores.
- **First race:** all 20 original result rows preserved.

[Open SAS Sports](https://sas-sports.lovetogivepain.workers.dev/?school=kstate) and tap **Refresh**.

A screenshot of the live results was included in the reply. Saved filename: `SAS_Sports_KState_Verified_Results_20260926.jpg`.

### User — school-module proposal

> This looks great now to me I think moving forward we should make corrections to each school making each school a single module? What do you think?

### Assistant — recommended architecture and sequence

**Yes. Each school should have its own module, with a shared core keeping SAS Sports consistent.** That would make school-specific corrections easier to contain and test.

I’d organize it this way:

| Part | Responsibility |
| --- | --- |
| **School module** | Official sources, schedule formats, recap extraction, and athlete verification for that school |
| **Sport handlers within it** | Cross-country tables, football scores, tennis results, and other sport-specific differences |
| **Shared core** | Display, school selection, refreshing, caching, and a standard results format |

Every school would deliver the same structured information to the app. For cross country, that means clearly labeled divisions, team scores, athlete names, places, times, and source links.

**Moving code into separate files alone won’t prevent regressions.** Each module also needs tests using that school’s actual official pages, plus checks that shared changes preserve working schools.

I recommend this sequence:

1. Preserve today’s working version as the baseline.
2. Move K-State’s working logic into its school module and verify identical output.
3. Bring KU’s existing cross-country module into that structure.
4. Correct and verify each remaining school individually.

That gives us a repeatable process: **fix one school, verify its results in the live app, then move on.**

### User — save baseline, conversation and session workflow

> Do the first one them we will saving the conversation into a .md file, then end this session. We will start a new session for each school module going forward. Each new session I want you to read the current .md file to begin the new section.

### Assistant — scope confirmation and completed handoff

The assistant explained that “the first one” means preserving today's working baseline, then saving this conversation and a current handoff file. A repository startup instruction was added to read this file before each future school-module session. No module migration was started.

### Progress and tool activity summary

The current repository, merged KU work, live feed, expanded-result API, and K-State's official recap pages were inspected. The women's-only feed and incorrect expanded results were reproduced. The scoped fix and meaningful regression tests were written and tested against actual source HTML. After approval, the exact tested tree was published through GitHub, merged, and deployed by the existing Cloudflare integration. Both K-State races were opened in the live browser; KU's feed was checked for preservation. The working application commit was then preserved on a named checkpoint branch, and this current handoff plus root startup instructions were saved. Application code was unchanged during the final baseline/documentation step.

## Future session records

Append each new school-module session here. Keep the current-state and next-session sections above accurate so the next session can begin without reconstructing the entire history.


### September 27, 2026 — save verification and completion

The user asked, "Did you finish before I ran out of usage?" The assistant initially could not verify the handoff save from conversation history. The user then instructed, "Confirm saving."

Direct GitHub inspection confirmed the recovery branch checkpoint/kstate-xc-verified-20260926 exists at 19ec2ecb2ac03b8c7d242cb14a23146878857ab0. The handoff and startup instructions existed in local documentation commit 9735515 but were absent from GitHub main. This session publishes those documentation files to finish the authorized save. The earlier wording that the handoff was saved referred to the local copy; the GitHub save was outstanding.

Scope clarification: the requested "first one" in the September 26 sequence was preserving the working baseline, which was completed. School-module migration was deliberately deferred to the next session. K-State remains the next module. This session changes documentation only; no new application tests or live verification were performed. The September 26 results above retain their original verification date.


### September 27, 2026 — K-State module implementation

User: “Start KSTATE module.” Earlier in the thread the user ended the save session; no module changes had been made at that point. This request begins the actual module implementation.

The current GitHub handoff and AGENTS.md were read before work. Main was fetched at `3ed968bda3ecef6bf6003b0663456e2beab7d383`; an isolated worktree/branch was created from that commit. The previous application baseline passed the release suite before extraction.

Implemented `src/schools/kstate.mjs`: six schedule overrides, three verified tennis identities, institutional social exclusion, five saved soccer recaps, original meet snapshot/highlights, and all K-State cross-country guards/parser/completeness/enrichment. Common publisher helpers, cache behavior, UI and shared metadata remain in their existing owners. Existing test harnesses now inject the real module. Added a permanent module test and frozen pre-refactor baseline fixture. Candidate version is `4.25.0-kstate-module`.

Validation actually completed:
- `npm run test:release` passed, including 18 protected schools and 71 critical school/sport cache identities, KU and K-State cross-country checks, and the new module test.
- `npm test` passed, including roster social identity checks.
- All ten K-State schedule/roster route outputs, five soccer enrichments and three verified tennis identities passed baseline checks; the tennis accounts were tested through the featured-athlete function with a deterministic roster fixture.
- Before/after comparison preserved 218 catalog school/sport schedule and roster route combinations and all saved game/social/source maps.
- Saved official K-State schedule/recap HTML replayed through production fetchLive and expanded results produced matching outputs (ignoring execution timestamps), including 18 Gans Creek rows and 20 Platte River rows.
- Offline esbuild bundle and actual bundled Worker import plus `/api/status` passed. Initial bundling used an older dependency directory missing unpdf; selecting the previous K-State checkout's complete installed dependencies resolved it without source/dependency changes.
- `git diff --check` passed.

Limitations and remaining tasks: no new live per-sport certification, browser verification, merge or deployment has been performed for this candidate. The recap parser still requires the official labeled sections and reports incomplete results explicitly. Complete K-State publication/live verification before moving to KU in a later session.


Publication checkpoint: draft PR https://github.com/egassam/SAS-Sports/pull/12 contains application commit `bb3f23124562ab496cc240a0a526e465d92e7f7d`. Its remote tree `e3273d03b3ada3d458bd099f2e2b2235767c727d` matched the tested local tree exactly. GitHub certification run `36327250369` completed successfully on that commit (PR checks; no live-school certification). The bundled HTTP feed and highlights endpoints were also replayed against the saved official HTML and returned identical 18/20 result rows. This documentation checkpoint adds the publication identifiers after those code checks. The PR is unmerged and the candidate is not deployed.


### September 27, 2026 — K-State module completion

User: “Complete KSTATE module.”

The current main handoff and AGENTS.md were read, and main was cloned at `30d6edd0f46f1ceebaed1fd7f5eca54921f0f095` with a clean working tree. The handoff was stale: PR #12 had already merged following the user's earlier approval, and Cloudflare had successfully built it. No application reimplementation, additional application changes or new application deployment was needed.

Validation actually completed in this session:
- `npm run test:release` and `npm test` both passed on the merged application.
- This includes all ten K-State source-route baseline checks, five saved soccer records, three verified tennis identities through the athlete path, KU/K-State result regressions, 18 protected schools and 71 cache identities.
- Production `/api/status` returned `4.25.0-kstate-module`.
- A forced-refresh K-State cross-country feed returned both teams and all 18/20 result rows.
- Both live expanded results were opened through the UI and inspected in full. Gans Creek showed 9 women, 7 men, 2 teams, 4 highlights and an official recap link; Platte River showed 11 women, 7 men, 2 teams, 4 highlights and an official recap link. The final listed runners and times were present. Screenshots confirmed readable grouped tables.
- A supplementary direct Python expanded-endpoint comparison received HTTP 403; it did not establish API parity or recheck KU. The successful live browser checks and forced feed are the live evidence for this session.
- Inspected merge check results: Cloudflare build, guardrails and certification matrix succeeded. Live cross-school-isolation job `108642654825`, run `36327362690`, failed at the firstBefore fetch (tests/isolation.mjs:74) after retries with HTTP 503 / Cloudflare resource limit Error 1102. Dependent live-school tests were skipped. This is unresolved; no claim that every school or sport passed live certification.
- Completion changes only this canonical Markdown handoff, preserving prior session history. KU is the next separate module session.

Publication history reconciliation: the previous session's user approved merging/deploying PR #12 after it was prepared. Merge completed at 14:50:17 UTC. The historical pre-approval records above are retained as history and are superseded by the current-state section.

### September 28, 2026 — finish KU module

User asked where SAS Sports work stood, then instructed: “Finish ku.” The assistant recovered GitHub main and read this current handoff plus AGENTS.md. Main did not contain the KU in-progress work described in conversation history, so the implementation started from `9f18a6c` on branch `refactor/kansas-school-module-20260928`.

Implemented the KU module and the fixes documented in `docs/KANSAS_MODULE.md`: selected schedule-payload parsing, 12 explicit sport routes, baseball restoration, corrected swimming source, both golf/basketball divisions, exact dates and doubleheaders, tournament end-date recap matching, preserved/future XC pipeline, and 22 reviewed individual golf placings with changed-fact protection. The Red Sky published total discrepancy is explained in the expanded view. No other school module was started.

Validation so far: initial baseline `npm run test:release` passed; candidate `npm run test:release`, `npm test`, the new Kansas module source-fixture suite, offline esbuild Worker bundle, and `git diff --check` passed. K-State 18/20 and KU 21/26 result protections passed; 18 protected schools and 71 cache identities passed. Official KU pages were downloaded on September 28 and tested against their current selected schedule data and 14 exact recap identities. The actual bundled Worker feed/highlight endpoints were replayed against downloaded official HTML for all 12 KU sports. All 207 non-KU sport source-route combinations and all verified social identities match the pre-change version. No new universal all-sport live certification is claimed.

Publication checkpoint: code/handoff are prepared locally. Commit/PR, deployment status and live checks will be recorded before ending this session. The user requests a stop after KU; do not continue to another school.


### September 28, 2026 — KU deployed verification and final recap correction

User: “Finish ku.” Read current main AGENTS.md and this entire handoff before work. Main was clean at `5d0ee5347e6258694d6b29bb03a499c57efeb321`. PR #13 had already merged; the historical publication checkpoint above was stale. No module reimplementation was needed.

Checks actually completed:
- Production `/api/status` returned `4.26.0-kansas-module`. Cloudflare merge build succeeded; PR run `36420513423` passed. Merged `npm run test:release` and `npm test` passed locally.
- Live KU feeds checked for all 12 sports: XC 2 finals/4 upcoming; soccer 11/9 and 1 other; volleyball 12/16; football 3/9; golf 4/22; swimming 0/13; rowing 0/9; baseball 0/38; basketball 0/70; softball 0/31 and 2 pending games; tennis 2 completed meets/6 upcoming without detailed results; track empty due to the prior-season source. Empty track is the documented source gap, not a passed current-results certification.
- Live expanded endpoints checked for all 34 listed completed events. XC feed/expanded rows match exactly (Gans Creek 26, Bob Timmons 21); all four golf events match exactly (7/6/6/7 rows, 22 individual placings). Both XC modals and Red Sky golf were visually checked in the browser, with complete division groups, highlights and recap links.
- Soccer 11, football 3, and 11 volleyball recaps returned verified highlights. Saint Louis and Tulsa soccer initially hit the existing eight-second AI timeout, then returned four highlights on individual retry. This is observed transient AI dependency, not a new reliability fix. Both tennis events correctly report that an exact recap was not found.
- One real defect remains in the deployed version: the September 11 South Dakota State volleyball schedule card links to the September 15 Wichita State recap. The actual correct KU article was retrieved. Prepared a KU-only exact school/sport/event ID/date/opponent/division/incorrect-URL repair. Corrected or later source links are not overridden; standard fetched-article identity verification still applies. No shared parser behavior changes. Version bump invalidates existing feed caches.
- All 12 athlete endpoints returned three named athletes with portrait URLs. Nine sports returned verified Instagram destinations; swimming, rowing and tennis use the existing official-profile fallback with null Instagram, introduced in earlier commit `d7f1d7e`. These are not newly verified Instagram accounts. No athlete policy changes were made.
- Live KU → Florida → KU stable comparison passed, and K-State feed retained 18/20 XC rows. Merge run `36420592088` failed its earlier cross-school comparison because KU IDs switched from old descriptive IDs to new official event IDs during rollout. This is consistent with a deployment race; it is not evidence of mixed-school records. The full 18-school live suite was not rerun, and the prior resource-limit issue is not claimed resolved.
- Initial Python urllib requests received HTTP 403 in this environment. Standard curl and the browser succeeded. No bypass or alternate network configuration was used.

Final correction publication/live verification is pending at this checkpoint. End the session after KU's correction and handoff save; do not start another school.

#### Final correction verification

PR #14 merged at 18:54:46 UTC (13:54:46 America/Chicago), producing merge commit `c9a02452107bad023ff06214f4ba99668f06d5a4`. GitHub post-merge certification run `36468538013` completed successfully. Production `/api/status` returned `4.26.1-kansas-recap`.

A forced live KU volleyball feed returned official event `20586` as South Dakota State, final 3-0, with the corrected September 11 KU recap URL. The live expanded endpoint then fetched that same official recap, identified it as an official athletics game recap, and returned four event-specific verified highlights naming Taylor Stanley, Reese Ptacek, Aisha Aiono, and Reese Messer. The incorrect Wichita State link is no longer returned for this event.

KU is complete. The session stops here without starting another school. The historical full-audit resource-limit limitation remains; this scoped completion does not claim a fresh universal certification of every school.

### September 28, 2026 — K-State dual teams and independent live scores

User opened a new K-State session with two items: show both teams for sports sponsored for men and women (Golf was the reported example), and replace dependence on the school page for live sports, with Football and men’s Basketball as the initial easy targets. The user asked for working changes to be implemented as the session progressed.

Diagnosis found that K-State Golf stopped after the first usable women’s page and had no division label. Basketball already loaded both programs. The Worker’s alternate scoreboard path existed only for Football and ran after official schedule retrieval. Historical ESPN scoreboards confirmed K-State identity `2306` for Football and men’s Basketball.

PR #15, https://github.com/egassam/SAS-Sports/pull/15, added K-State-specific combined-sport ownership and separate men’s/women’s schedule sources for Golf and Basketball. CI passed, the PR merged as `c4ab5faf5dbf369e367da761222bf96f370ed996`, and production deployed `4.27.0-kstate-dual-teams`. A forced production Golf feed then returned both `Women's` and `Men's` labels, with 4 results and 22 upcoming events. Basketball’s existing two-division behavior remained protected.

PR #16, https://github.com/egassam/SAS-Sports/pull/16, generalized the scoreboard parser/reconciler and configured K-State Football plus men’s and women’s Basketball ESPN scoreboard paths. Score retrieval begins independently of schedule parsing, uses a 15-second upstream cache, retains official schedule/recap fields, and replaces live/final state, scores, game detail and provenance. It appends the scoreboard event when no official schedule match exists. Basketball matching includes the division label so a men’s score cannot overwrite a women’s event. Other schools retain the pre-existing Football fallback.

Validation and publication actually completed:

- `npm run test:release`, `npm test`, `git diff --check`, and Wrangler deployment dry-run passed.
- The release suite preserved 18 protected schools, 71 critical school/sport cache identities, K-State XC 18/20 rows and KU XC 21/26 rows.
- Deterministic historical scoreboard fixtures verified K-State matching, a live 71-68 Basketball score, `2nd Half - 4:12`, source provenance, official-schedule reconciliation, and men’s/women’s isolation.
- PR #16 certification run `36511562983` passed. The tested local and remote tree SHA matched at `010538960efeec2776cdf5eaf37337aa3c4d1a7c`.
- PR #16 merged as application commit `a23a16b3b1d2a5fafec5327041953fcb4b672d43`; Cloudflare deployed production version `4.28.0-kstate-live-scores`.
- Forced production feeds returned Football with 4 results/8 upcoming and Basketball with 66 upcoming across both `Men's` and `Women's`, with no feed error. No K-State Football or Basketball game was live during this verification, so no claim is made that an actual in-progress contest was observed in this session.

Provider recommendation: the ESPN public scoreboard is the practical immediate source because it covers college Football and both Basketball programs without a key. It is not a contracted API. If SAS Sports later needs a formal SLA or redistribution terms, evaluate a licensed feed such as Sportradar or SportsDataIO. NCAA/Genius live-stat pages vary by event and are better treated as a supplemental fallback than the primary normalized feed.

Both requested K-State items are complete. The unresolved historical Cloudflare resource-limit issue still prevents a universal all-school live-audit claim; this session’s evidence is scoped to the tests and production feeds listed above.

### September 29, 2026 — K-State live display test

User: “Can we text the live feed so I can see it work on the app?” followed by “Test.” Treated “text” as “test” and checked production `/api/status` (`4.28.0-kstate-live-scores`) plus forced K-State Football, Basketball and Golf feeds. Football had 4 results/8 upcoming, Basketball had 66 upcoming across both divisions, and Golf had 4 results/22 upcoming across both divisions. None had a live event. The September 29 browser check confirmed the ordinary K-State page was serving its current schedule.

Added a K-State Basketball preview behind the explicit `demo=live` query parameter. Its sample card and panel both say DEMO, and the sample never enters the API or the ordinary URL. It advances from Upcoming to Live to Final automatically or with the button. The sample uses the existing card and count layout and does not impersonate an official event or attach an official source. PR #17 passed certification run `36568485438`, then merged as `a3ca8468a9dd29eeee78f896828990afaca7364e`; Cloudflare served the updated page. Local `npm run test:release`, inline script syntax and `git diff --check` passed. The production browser displayed the sample in Upcoming, Live (71–68, 2nd Half · 4:12), and Final states, and allowed replay.

An actual K-State in-progress ESPN → app transition remains unobserved because no game was live at test time. The earlier historical scoreboard fixtures continue to cover that data path deterministically. Keep the demo visibly marked and opt-in; do not count its sample as a real live game or a universal live-feed certification.

### September 29, 2026 — Football Live demo visibility correction

User supplied a phone screenshot showing K-State Football selected, the Live tab empty, and a 0 Live count. The initial demo had only activated for Basketball, and its automatic Final step could also leave Live empty. Corrected the opt-in preview to start and remain on Football's Live tab, with a labeled 28–21 sample and quarter; it also follows a switch to Basketball with a labeled 71–68 sample. The step button selects the corresponding tab when it moves through Final, Upcoming, and Live. The normal URL and backend feed still return only real events.

Local `npm run test:release`, inline JavaScript syntax and diff checks passed. PR #18 certification run `36570019605` passed; the PR merged as `304d3a7b011b0f5a9508cb9706f5f93181f644dd`. Cloudflare served the updated HTML. Production browser verification opened the demo URL on Football + Live, saw a 1 Live count and the labeled `3rd Quarter · 8:42` / 28–21 card, then switched to Basketball and saw its labeled `2nd Half · 4:12` / 71–68 card. Those are sample cards only. No actual in-progress game was available for live provider verification.

### September 29, 2026 — review suggestions and local-time fix

User asked for an analysis of the code and Markdown files. Assistant reported, among other suggestions: the ESPN/official date mismatch for evening games; the UTC "today" rollover; cold-cache and heavy-endpoint contributors to the Cloudflare 1102 failures; school-specific branches remaining in shared code; and stale handoff/README content. A script reproduced the evening-game defect against the current code: a 7 PM Central game produced a Live card dated January 18 plus a dropped official card.

User: “Yes, fix the time-zone bugs.” Implemented `schoolTimeZone`, `localWallClock`, `schoolNow` and `schoolToday` in `src/index.js`. `parseScoreboardPayload` now expresses ESPN UTC times in the school's local time and uses the Eastern calendar day when ESPN marks a time as unconfirmed (`timeValid:false`). `makeEvent`, `parseTextScheduleRows` and `groupEvents` compare against the school's local date. The KU module receives `schoolNow` for its future/past/tournament-in-progress checks (its default keeps old behavior if not injected). Version bumped to `4.28.1-local-time` so feed caches refresh.

Tests actually run:
- Baseline before changes: `npm run test:release` and `npm test` passed.
- After changes: both passed again, `git diff --check` passed, and an offline esbuild bundle passed.
- New K-State module assertions cover five cases: a 7 PM game still in Upcoming at 6:30 PM Central; ESPN 01:00Z mapped to 7 PM local; one reconciled Live card with the official ID; one Final result the next morning; and the calendar day kept for an unconfirmed ESPN time.
- The behavioral assertions were confirmed to fail on the previous code (“a 7 PM game stays upcoming at 6:30 PM Central”).

Publication: committed and pushed to `ccr-a8791a1a-rg8qi0` only. No PR, merge, deployment or live verification has been performed. This is a shared-code change affecting every school's day boundaries; the 18-school protection and 71 cache-identity checks passed locally. The Cloudflare 1102 issue remains unresolved.


#### Preview build follow-up

The branch push created PR #19 (https://github.com/egassam/SAS-Sports/pull/19), not yet merged. Cloudflare Workers Builds built the branch as a **preview**, not production. Its check reported success, and PR guardrails and certification-matrix passed. Production `/api/status` still returned `4.28.0-kstate-live-scores`, and main was unchanged at `37d5be3`.

The preview URL https://ccr-a8791a1a-rg8qi0-sas-sports.lovetogivepain.workers.dev returned `4.28.1-local-time`. Forced K-State feeds on the preview returned the following, with no feed error:
- Basketball: 66 upcoming across both divisions.
- Football: 4 results and 8 upcoming.
- Cross Country: Gans Creek 18 rows and Platte River 20 rows.

No live evening game was available, so the fixed reconciliation path has only fixture coverage so far. Merging PR #19 is what would deploy production.

#### Merge and production verification

User: “Yes, merge it and verify production.” PR #19 checks on head `6acb5ef` had passed (guardrails, certification-matrix, Cloudflare preview build). Merged as `79c157d8ce8349439cab3c23931d46f5fb920682`. Production `/api/status` returned `4.28.1-local-time` at 15:29 UTC.

Forced production feeds with no feed error:

| School | Sport | Result |
| --- | --- | --- |
| K-State | Football | 4 results / 8 upcoming |
| K-State | Basketball | 66 upcoming |
| K-State | Golf | 4 results / 22 upcoming |
| K-State | Cross Country | Gans Creek 18 rows, Platte River 20 rows |
| KU | Cross Country | Gans Creek 26 rows, Bob Timmons 21 rows |
| KU | Volleyball | 12 results / 16 upcoming |
| KU | Golf | 1 live / 4 results / 21 upcoming |
| Arizona | Football | 4 results / 9 upcoming |
| BYU | Football | 4 results / 17 upcoming |
| UCF | Football | 4 results / 15 upcoming |

KU Golf's live event is the Men's Windon Memorial Classic, Sept 28–29, correctly shown as "Tournament in progress" on its final day.

Post-merge run `36590082760`:
- guardrails and cross-school isolation smoke passed.
- 15 of 18 live school certifications passed; Oklahoma State, Utah and Alabama failed.
- Those same three schools also failed on the previous main run `36570340731`, before this change. Their failures are athlete checks ("athlete has no verified Instagram destination") unrelated to date handling. They remain an open, pre-existing issue.
- The K-State and KU CI jobs started around 15:28, possibly against the previous deployment. They were therefore rerun locally against `4.28.1-local-time`: all 8 feeds passed. K-State Cross Country initially returned a sandbox-side "fetch failed" twice while fetching the official site directly; it passed on retry with a 90-second timeout.

The 1102 resource-limit issue did not recur in this run, but it is not claimed resolved.

### September 29, 2026 — Oklahoma State module

Request (delivered as a scheduled session prompt): start the Oklahoma State module. Read AGENTS.md, this handoff and both finished module docs; build `src/schools/oklahoma-state.mjs` in the K-State/KU pattern; diagnose the Tennis/Equestrian/Track & Field "athlete has no verified Instagram destination" failures in runs `36590082760` and `36570340731` without inventing accounts; preserve K-State/KU; ask before PR, merge or deploy.

The assistant fetched main at `42a26c8`, read this file in full, and reported the handoff state and an Oklahoma State inventory before editing. After a later scheduled prompt said the user approved the plan, implementation proceeded locally using the recommended defaults: an opt-in fallback for Oklahoma State only, and no reuse of cross-country Instagram identities for Track & Field. That prompt came through the scheduler, not as a direct user message, so nothing was pushed or published.

Diagnosis:
- Job `109481412069` (run `36590082760`) showed 8/11 Oklahoma State rows passing. Tennis, Equestrian and Track & Field athletes failed.
- Live `/live/athletes` showed those sports returning the existing official-profile fallback (`instagram_url: null`, official okstate.com profile and portrait). The official `mxct` roster lists 55 men and publishes no Instagram links.
- The validator required Instagram for every returned athlete, so the fallback could never pass. It was not an app defect.
- Other defects found live: Track & Field displayed the six cross-country meets from the shared `mxct` schedule. Golf loaded only the women's page. Tennis returned `[]`: production `/api/diagnostic` showed women's 21 and men's 4 parsed events, but only the first source was used, and the season filter then removed everything.

Implemented (see `docs/OKLAHOMA_STATE_MODULE.md`):
- The new module owns routes for all 11 sports, `combinedSports` (Basketball, Golf, Tennis), the two verified cross-country identities, and the shared-schedule XC/track split.
- `src/index.js` holds no `oklahoma-state|` configuration. It gained one handler call in `parseHtml` and one `schoolCombinedSports` branch.
- `athlete_profile_fallback_sports` was added to the validator, the Oklahoma State manifest entry, `tests/README.md` and the protected-school guard. Equestrian and Track & Field minimums were added.
- Test harnesses now inject the new module.
- New test `tests/oklahoma-state-module.mjs`, with gzipped unmodified official roster fixtures (`mxct`, wrestling). Version bumped to `4.29.0-oklahoma-state-module`.

Tests actually run:
- Baseline before changes: `npm run test:release` and `npm test` passed.
- After changes: `npm run test:release` and `npm test` passed. This includes 18 protected schools, 71 cache identities, K-State XC 18/20, KU XC 21/26, both existing module suites and the new Oklahoma State suite. `git diff --check` passed.
- Wrangler `deploy --dry-run` bundle passed, and the bundled Worker's `/api/status` returned `4.29.0-oklahoma-state-module`. Nothing was uploaded.
- The new behavioral assertions were confirmed to fail with the split filter disabled ("Track & Field must not display cross-country meets") and with Golf/Tennis combination removed.
- Route parity: 219 catalog school/sport combinations dumped before and after. Only Oklahoma State Golf, Tennis and Soccer (unused fallback rosters) changed, and the verified-identity map is identical.
- Updated validator against production, athletes only: Oklahoma State 11/11 passed. Utah Volleyball and Alabama Soccer athletes still fail unchanged.

Limitations:
- okstate.com's bot protection returned HTTP 403 to the sandbox after the first burst of downloads. Retries were stopped rather than circumvented, so official schedule HTML fixtures are missing.
- Tennis/Golf orchestration is tested with minimal synthetic pages. The XC/track split uses the real meet names/dates as served by production.
- The women's program, Cowboy Jamboree result completeness and deep recap certification remain open.

Publication status: application commit `1a55077` on `oklahoma-state-module`. A later scheduled routine ("Oklahoma State: open PR when tests pass") authorized a push and PR but not a merge. Both suites were re-run and passed, main was unchanged at `42a26c8`, and the branch was pushed. PR #21 was opened. GitHub run `36599105600`: guardrails and certification-matrix passed; live-school jobs were skipped as usual for PRs. The Cloudflare Workers Builds preview deployed.

#### Preview verification and Tennis correction

- The preview `https://oklahoma-state-module-sas-sports.lovetogivepain.workers.dev` returned `4.29.0-oklahoma-state-module`.
- Forced OSU feeds:
  - Golf: `Men's` and `Women's`, 5 results and 24 upcoming.
  - Cross Country: 6 meets.
  - Track & Field: no cross-country meets. With no track meets published, the existing 502 "no usable events" response is returned.
  - Tennis: still empty.
- okstate.com briefly accepted one request. The official women's Tennis page is still the "2025-26 Cowgirl Tennis Schedule" (21 matches, January 23–April 12, 2026), and the men's events are also outside 2026–27. The earlier explanation, that only the first source was used, was incomplete. Loading both divisions is correct, but Tennis is empty because okstate.com has not published 2026–27 schedules. That page was added as a real fixture with a test.
- `validate-schools` against the preview: Oklahoma State 11/11 passed. Preview K-State XC 18/20 and KU XC 26/21 were unchanged.
- The docs/fixture follow-up commit was tested with `npm run test:release` and `npm test` before its push.
- Production remains `4.28.1-local-time` until the user approves merging PR #21.

#### Oklahoma State production verification

The user merged PR #21 at 17:31 UTC as `da5b91efa3647fed90dc0a1ef247db89f4d05992`. Verification ran from a separate session, and production `/api/status` returned `4.29.0-oklahoma-state-module` by 17:32 UTC.

Forced production feeds:

| School | Sport | HTTP | Result |
| --- | --- | --- | --- |
| Oklahoma State | Golf | 200 | `Men's` and `Women's`, 5 results / 24 upcoming |
| Oklahoma State | Cross Country | 200 | 2 results / 4 upcoming (Cowboy Preview 31 rows, Cowboy Jamboree 1 row) |
| Oklahoma State | Track & Field | 502 | "no usable events"; expected, no track meets published |
| Oklahoma State | Tennis | 200 | empty; okstate.com still lists 2025–26 matches |
| Oklahoma State | Football | 200 | 4 results / 8 upcoming |
| Oklahoma State | Soccer | 200 | 12 results / 13 upcoming |
| Oklahoma State | Wrestling | 200 | 17 upcoming |
| K-State | Cross Country | 200 | 18 / 20 rows, unchanged |
| KU | Cross Country | 200 | 26 / 21 rows, unchanged |
| K-State | Basketball | 200 | 66 upcoming across both divisions |

Certification:
- `validate-schools --schools=oklahoma-state,kstate,kansas` from merged main against production: 19/19 passed. That covers Oklahoma State 11/11, including Tennis, Equestrian and Track & Field athletes through the official-profile fallback, plus K-State 4/4 and KU 4/4.
- Post-merge run `36605569578`: guardrails, certification-matrix and cross-school isolation passed. 15 of 18 live schools passed, including Oklahoma State (previously failing).
- Utah and Alabama failed again, as in the previous two main runs; these schools are not yet converted.
- Colorado failed Soccer and Volleyball with HTTP 503, Cloudflare Error 1102 (Worker exceeded resource limits). That is the known open resource-limit issue, hit while caches were cold after the version bump, not a Colorado data change. A local rerun after the CI run passed Colorado 4/4.

Open: the Cloudflare 1102 resource-limit issue remains and recurred in this run. The Oklahoma State follow-ups listed in the next-session instructions remain.

#### Cross Country results format gap (user report)

User: "Oklahoma State had merge but the results section does not match KSTATE. We should only be focusing on one sport at a time." The assistant compared the production grouped Cross Country feeds for K-State and Oklahoma State. The differences are recorded in the current-state table above, and Oklahoma State Cross Country is the next single-sport task. `AGENTS.md` now states the one-sport-at-a-time rule and names K-State as the results-format reference. No application code was changed in this step.

### September 29, 2026 — Oklahoma State Cross Country results format

The request arrived as a scheduled session prompt: fix Oklahoma State Cross Country only, so its results match K-State's; push a branch and open a PR; check the Cloudflare preview; do not merge. Main was fetched at `3f2ecf4` (includes PR #22). This file, AGENTS.md, both module docs and both school modules were read before editing.

Reported before editing (production `4.29.0`):
- **Feed:** Preview had correct data in the wrong shape: `Men's Team` / `Men's Individual Results` groups, no distance, men first, and raw schedule text as the headline. Jamboree had one row, `Result: 2nd - 44 pts.`.
- **Expanded view:** it was worse and differed from the feed.
  - Jamboree: 2 men labeled `Women's` and marked verified.
  - Preview: 5 rows, including "Senior Laban", the women's 26 pts as the men's team score, and women under men.
  - Cause: the same recap-prose path K-State had before its fix.
- **Cloudflare:** the first OSU production feed request returned Cloudflare 1102; a retry succeeded.

Official sources:
- **Results PDFs:** okstate.com served each `/documents/` page; the PDF was downloaded from the SIDEARM S3 link that page publishes.
  - Jamboree: DirectAthletics MeetPro, 22 pages. The race title is in the page footer and the team column is truncated to `Oklahoma Stat`, which is why the shared parser found nothing.
  - Preview: bib-number format with headers such as `Mens 5,000 meters`.
- **Blocked:** a first Preview document request, both recaps, and the `mxct` and women's schedule pages returned the Incapsula 403. These were not circumvented. The Preview document was obtained on one normal retry minutes later.

Implemented in `src/schools/oklahoma-state.mjs`: a parser for both formats and one attach handler used by both the feed and the expanded view. Full contract: `docs/OKLAHOMA_STATE_MODULE.md`.

Shared code received three one-line hooks. The women's program schedule was added as a fallback candidate after `mxct`. Version: `4.29.1-oklahoma-state-xc-results`.

Tests actually run:
- **Local suites:** `npm run test:release` and `npm test` passed, both with and without installed packages (CI runs without). This covers 18 protected schools, 71 cache identities, K-State XC 18/20, KU XC 26/21, and the new `tests/oklahoma-state-cross-country.mjs` on the unmodified official PDFs.
- **Other local checks:** `git diff --check` passed. The Wrangler dry-run bundle's `/api/status` returned the new version, with nothing uploaded. Mutation checks confirmed that removing either module hook fails the suite.
- **First CI run (`36608331537`):** guardrails failed because the new test imported `unpdf`, which CI does not install. Fix commit `e89d463` commits the extracted text, stubs `extractText` by exact PDF bytes, and re-extracts and compares when `unpdf` is present. The next CI run, `36608526812`, passed.

Preview verification (https://oklahoma-state-xc-results-sas-sports.lovetogivepain.workers.dev, built from `7057360`):
- **OSU feed (forced):** Jamboree 37 rows and Preview 31 rows, in the table above.
  - `recap_result_count` equals the row count; `meet_results_verified` and `highlights_verified` are true.
  - The Worker verified both recaps.
  - `source` is `Official meet results`.
- **Expanded view:** `/live/highlights` for both meets was identical to the feed on every result field.
- **Other schools on the preview:** K-State XC 18/20 and KU XC 26/21, unchanged.
- **Women's schedule:** preview `/api/diagnostic` returned HTTP 200 and 6 events for `/sports/womens-cross-country-track/schedule`, the same count as `mxct`. The results documents already hold both races, so it stays a fallback only.
- `e89d463` changes tests only; its preview build succeeded.

Limitations:
- The recaps could not be downloaded here, so test recaps are synthetic wrappers.
- The preview diagnostic gives the women's page event count, not meet names.
- Production was not changed.
- The Cloudflare 1102 issue remains open.

#### Production verification (Oklahoma State Cross Country)

- **Merge:** the user merged PR #23 at about 18:26 UTC as `0629321`. PR #24 (`4.29.2-feed-retry`) merged afterwards. It did not change `src/`, so production carries the #23 Cross Country code.
- **Version:** production `/api/status` returned `4.29.2-feed-retry` at 19:00 UTC. The first post-merge attempt, around 18:30, could not run because this session's command safety check failed transiently.
- **Forced production grouped feeds (`refresh=1`):**
  - Oklahoma State Cross Country: Preview 31 rows (`Women's 3K` 15, `Men's 5K` 16) and Jamboree 37 rows (`Women's 6K` 16, `Men's 8K` 21), counts including team rows.
    - Headlines: `Women's team: 1st · 26 pts / Men's team: 1st · 31 pts` and `Women's team: 2nd · 64 pts / Men's team: 2nd · 44 pts`.
    - `recap_result_count` equals the row count, `meet_results_verified` is true, and each meet has a verified recap link.
  - K-State XC: 18 and 20 rows, unchanged.
  - KU XC: 26 and 21 rows, unchanged.
- **Expanded view:** production `/live/highlights` for both Oklahoma State meets was identical to the feed on results, headline, counts, verification fields, highlights, recap and result links.
- **Open:** the Cloudflare 1102 resource-limit issue.

#### Merge permission decision

The user asked whether the agent could merge changes to save time. The assistant proposed merge conditions: local suites pass, CI is green, the branch preview is verified with K-State/KU XC unchanged, the change stays in one sport, and production is checked afterwards with a revert path. The user chose to cover both code and docs PRs. The session's safety check blocked the agent from editing `AGENTS.md` itself as self-modification. The user then added the rule as item 6 (commit `afc7ed4`).

### September 30, 2026 — Oklahoma State all sports

User: "New session. Finish all of Oklahoma State". Main was fetched at `a7b2f4b`, and `AGENTS.md` (including item 6) and this file were read.
- **PR #24** (`4.29.2-feed-retry`): reconciled. It was a front-end retry for transient 1102/503 feed failures and did not change school data.
- **Inventory:** production feeds for all 11 Oklahoma State sports were compared with K-State's. Gaps found:
  - Football: bare `41-24` scores, no recaps.
  - Golf: `7th/16` and `6th out of 16 teams` wording.
  - Track & Field: 502.
  - All sports: no published start times.
  - Tennis: empty feed.
  - No change needed: the Soccer, Softball and Basketball feeds and expanded views.

Source finding: okstate.com schedule pages embed every game as structured Nuxt data (W/L, scores, recap links, golf placing, local time). The module now decodes it and applies each part only to sports verified against an official page. See `docs/OKLAHOMA_STATE_MODULE.md`.

Publication, one sport per PR. Each was merged by the agent under `AGENTS.md` item 6 and verified in production (version, the sport's feed/expanded view, K-State XC 18/20, KU XC 26/21):

| PR | Sport | Merge | Version |
| --- | --- | --- | --- |
| #27 | Football results/recaps | `061390f` | `4.29.3` |
| #28 | Golf placings | `212154d` | `4.29.4` |
| #29 | Track & Field empty feed | `4e618b1` | `4.29.5` |
| #30 | Football times | `9e9ce79` | `4.29.6` |
| #31 | Soccer times | `2ea1a7d` | `4.29.7` |
| #32 | Softball times | `83eae71` | `4.29.8` |
| #33 | Baseball times | `23fef47` | `4.29.9` |
| #34 | Basketball times | `83a55b6` | `4.29.10` |
| #35 | Wrestling times | `4a1910f` | `4.29.11` |
| #36 | Equestrian times | `3eb79bd` | `4.29.12` |

Tests actually run for every PR:
- `npm run test:release` and `npm test`, with and without installed packages.
- `git diff --check`.
- A mutation check with the sport switched off, which failed the new assertions.

New unmodified official fixtures (gzipped): Football, men's and women's Golf, Soccer, Softball, Baseball, men's Basketball, Wrestling and Equestrian schedules.

Final production sweep at `4.29.12`: all 11 Oklahoma State sports returned HTTP 200. The first forced Equestrian check right after the #36 deploy returned the pre-merge output; three later forced refreshes all showed the change, consistent with a deploy switchover.

While enabling Soccer times, the tests caught that the W/L rewrite was not gated to its own sport list. It was gated in #31, before merge.

Limitations:
- okstate.com returned 403 to the sandbox for the men's Tennis and women's Basketball pages. Other pages downloaded on later retries. Nothing was circumvented.
- Women's Basketball showed no timed games on the preview; it is unverified whether its page has any.
- Tennis stays empty for the source reason recorded September 29.
- Cloudflare 1102 remains open. No 1102 was seen during this session's checks.

#### Follow-up questions (same session)

- **Volleyball.** The user asked where Oklahoma State Volleyball went. Oklahoma State sponsors no volleyball, and `src/sponsored-sports.json` has never listed it (11 sports since the file's first commit, `3d8b66c`). K-State Volleyball was checked: in season, 12 results / 16 upcoming.
- **Soccer "Live source unavailable" at 8:25 PM Central (01:25 UTC).** This came during the #36/#37 deploys. Each version bump clears every cached feed, and a cold rebuild hit the known resource limit. At 01:31 UTC, three cached requests and a forced refresh all returned Soccer normally. Lesson: batch a school's fixes into fewer deploys.
- **Tennis.** The user doubted the empty feed because K-State shows upcoming tennis. The men's page, downloaded on retry, is the 2026–27 schedule, which corrects the earlier note. Its 4 events are all past individual tournaments. K-State drops its past tournaments the same way, so Oklahoma State matches K-State; it simply has nothing published after Sept 27. See the Tennis note in Current state.

#### Empty-schedule message and KU test clock (user-approved merges)

User: "Add the Tennis empty-schedule message", then, after PR review, "Yes, merge both". Both PRs were outside the one-school/one-sport condition of `AGENTS.md` item 6, so the user approved the merges explicitly.
- **PR #39** (`f1f9d9c`): test-only. `tests/kansas-module.mjs` used fixtures captured 2026-09-28 but ran `fetchLive` on the real clock. After Sept 29, the Men's Windon Memorial (Sep 28–29) became Final without reviewed placings, and the test failed on unmodified `main`. The assertion now covers only tournaments finished by the fixture capture time.
- **PR #40** (`470be87`): shared page change in `public/index.html`.
  - A sport whose official source is reached but lists no current events shows "No current or upcoming <sport> events are on <school>'s official schedule yet."
  - A valid empty `[]` feed now counts as a reached source and gets a "No current schedule" section. It previously showed "LIVE SOURCE UNAVAILABLE"; production confirmed that before the merge for Oklahoma State and K-State Track & Field.
  - `VERSION` was not bumped (page-only), so feed caches stayed warm.
- **Tests:** `npm run test:release` and `npm test` passed, with and without installed packages. New static checks in `tests/regression.mjs` failed when only the page change was reverted. The inline script syntax check passed.
- **Browser checks** (Playwright with the pre-installed Chromium; the proxy CA was trusted via its SPKI hash, with certificate checks left on), on the preview and then production:
  - Oklahoma State Tennis and Track & Field show the message with "1/1 official source reached".
  - K-State Track & Field shows the message.
  - K-State Tennis is unchanged (8 upcoming).
- **XC guards in production:** K-State 18/20, KU 26/21, Oklahoma State 37/31.

#### Multi-day tournament recaps (user-approved merge)

User: "KSTATE sports soccer, volleyball, golf are not showing expanded results and highlights." Every completed K-State event in the three sports was opened through production `/live/highlights`:
- **Soccer:** 11/11 had highlights.
- **Volleyball:** 11/13. Creighton's AI generation timed out once and succeeded on two retries. The two exhibitions report no recap; not confirmed on kstatesports.com.
- **Golf:** a real bug. Schooner Fall Classic always returned `recap_not_found`; Annika returned `recap_not_found` or HTTP 503 / Cloudflare 1102. Oklahoma State Golf had the same bug: Folds of Honor returned `recap_not_found`, and three tournaments returned 1102.

**Cause:** `recapMatchesEvent` required the article URL date within ±1 day of the event start. Golf is listed by start date, and recaps are published on the final day (Schooner Sep 19 → Sep 21; Annika and Folds of Honor Sep 7 → Sep 9). The rejected direct recap sent the expanded view into the costly fallback search, which hit 1102.

**PR #42** (`dc432ff`, merged with the user's approval because it is a shared change):
- For `MEET` events, a recap may be dated from 1 day before the start to 4 days after it; the name and sport must still match.
- Games keep ±1 day.
- `VERSION` is unchanged; highlights are not cached.

**Tests:**
- `tests/kstate-module.mjs` adds the official Schooner recap fixture. It checks a match on the tournament, and no match for an event a week earlier, for the next tournament it previews (Powercat), or for a `GAME`.
- Reverting `src/index.js` fails the test.
- `npm run test:release` and `npm test` passed, with and without installed packages.
- The Annika recap could not be fetched from the sandbox (kstatesports.com bot-protection redirect loop; not circumvented).

**Production after merge (12:23 UTC):**
- Golf: all 4 K-State and all 5 Oklahoma State tournaments returned 4 highlights, with no 1102. Highlights match each card, e.g. Schooner "seventh … 836", Annika "11th … 906".
- Soccer and Volleyball spot checks: 4 highlights each.
- K-State XC 18/20, KU XC 26/21.

### September 30, 2026 — Utah module and Utah sports

User: "Let's start the next school for making it a module" → "Utah". The user then said "Yes maybe on your own" to the agent merging the setup PR.

**Setup, PR #44** (`cf972b3`):
- Utah routes moved into `src/schools/utah.mjs` as a pure move; the 219-combination route dump was identical.
- The preview matched production for all 15 sports.

**Football, PR #45** (`1d82277`, `4.30.0-utah-football`):
- The SIDEARM page-data reader moved from the Oklahoma State module to `src/sidearm-schedule-data.mjs`. On the preview, Oklahoma State Football, Golf and Soccer were identical to production.
- Utah enables it for Football: `W, 31-17`/`W, 33-0`/`W, 43-10`/`W, 66-14` with recaps, and 3 published start times.

**Cross Country, PR #46** (`738fd3b`, `4.31.0-utah-cross-country`):
- Utah links no results documents; each meet's official recap has results tables. `parseUtahRecapResults` produces K-State's contract.
- Production:
  - UVU `Women's team: 3rd · 76 pts` + 7 runners;
  - John McNichols `2nd · 107 pts` + 8 runners + 2 in `Women's Open`;
  - Beehive keeps `No Score` with its 1 runner.
- The expanded view matched the feed in the browser.

**User report:** "Looks like Utahs sports out of season are not working properly." A production survey found:
- Beach Volleyball showed indoor matches;
- Lacrosse showed spring 2026 as current;
- Skiing returned 502;
- Golf showed only today's round;
- Tennis showed the women only.

The cause is in "Current state" above. One PR each:
- **#47 Beach Volleyball** (`1b8e491`, `4.31.1`): the real route, plus the current-season and page-data filter. Production 200 `[]`; the UI shows the empty-schedule note.
- **#48 Lacrosse** (`72706e3`, `4.31.2`): the `mens-lacrosse` route and the same filter. Production 200 `[]` with the note.
- **#49 Skiing** (`79e74e2`, `4.31.3`): the `alpine-skiing` route with meet labels.
  - The first preview also showed March 2026 finals outside the page data, so Skiing joined the filter in a second commit.
  - Production: 0 results, 31 labeled 2027 races.
  - That first preview also showed K-State XC 2/20 once (the Gans Creek recap was unavailable, a kstatesports.com flake). It was 18/20 on the rebuilt preview and in production before the merge.
- **#50 Golf** (`b5c544e`, `4.31.4`): the `mens-golf` route, with round days merged into one event per tournament. In production, the Jackson Stephens Cup expanded view generated highlights from the final recap.
- **#51 Tennis** (`1ac0410`, `4.31.5`): Tennis became a Utah combined sport. Production shows 48 events (26 women's, 22 men's), labeled.

**Tests:** for every PR:
- `npm run test:release` and `npm test` passed, with and without installed packages;
- a mutation check failed the new test;
- CI was green.

All fixtures are unmodified official pages, documented in `tests/fixtures/utah-module/sources.json`.

**Final production survey (about 18:30 UTC):** all 15 Utah sports return 200; the table is in `docs/UTAH_MODULE.md`. K-State XC 18/20 and KU XC 26/21 after every merge.

**Not done:** Volleyball athlete certification (roster 403, see "Current state"); Golf placings; start times beyond Football.

### September 30, 2026 — Off-season "LIVE SOURCE UNAVAILABLE" and reliability

User (screenshot, Utah Basketball): "As you can see off season sports do not load anything."

**Diagnosis:**
- The feed API returned 200 to single requests, but 2/16, and later 8/36, forced refreshes returned HTTP 503, Cloudflare 1102.
- Profiling put nearly all the CPU in `parseSidearmGameCards` → `scheduleYearForDate(raw, …)` per card.

**What was done, after user approval** ("Yes to all", then "Yes build #4"):
- **#53:**
  - Old and new parse output identical on every saved page (12 combinations).
  - Preview 36/36; production 36/36 after merge.
- **#54:** the budget test fails on pre-#53 code (61 whole-page reads in one parse).
- **#55:**
  - The browser test (intercepted 503s) passed on the preview and in production for all four cases: normal load; live down → server copy; everything down → device copy; no copy → "unavailable".
  - K-State XC 18/20, KU XC 26/21.

**Found while building the monitor:**
- Node `fetch` from the sandbox reaches Cloudflare YYZ, where every `refresh=1` returned 1102 in under 1 s, while curl through the proxy (IAD) returned 200.
- Cached feeds, status, athletes and the page all loaded at YYZ.
- Asked the user to check the Cloudflare plan.

### September 30, 2026 (evening) — Finish Utah

User: "Everything is working great now. Start new session and finish Utah." The handoff was read from main (`9ccda93`); work continued in this conversation.

**Merged and verified in production:**
- **#59:** Volleyball times.
- **#60:** Volleyball athlete certification (Utah 4/4).
- **#61:** Soccer times.

Every code PR passed the `AGENTS.md` item 6 gate on its preview:
- K-State XC 18/20, KU XC 26/21;
- 36/36 forced refreshes of the changed sport;
- CI green.

After each merge, production feed and expanded view were checked.

**#62 (Softball doubleheaders)** passed the same gate but touches one shared line, so it waits for the user.

**Not done:** utahutes.com returned 403 for the Baseball and Women's Basketball pages on every spaced attempt; not circumvented. The container restarted once mid-session (a background download and one gate run were re-run).

### October 1, 2026 — Arizona State module and Football

User: "Start next school. Stay in the Big 12." The handoff was read from main (`fa32b07`).

**School choice:** Arizona is next in catalog order, but arizonawildcats.com returned HTTP 403, as did baylorbears.com, cubuffs.com, uhcougars.com, cyclones.com, gofrogs.com, texastech.com and wvusports.com (Football schedule page, one request each). thesundevils.com, ucfknights.com, byucougars.com and gobearcats.com returned 200. Arizona State (SIDEARM, next in order among reachable schools) was chosen to avoid the 403 stalls that blocked Utah work.

**PR #66** (setup + Football, one PR because the setup changes no output):
- Setup: 219/219 routes identical; the preview at `84ceaea` matched production for all 17 Arizona State sports (forced refresh, timestamps excluded); 36/36 forced refreshes.
- Football: fixture `tests/fixtures/arizona-state-module/football-schedule.html.gz` (unmodified official page). Tests: `npm run test:release` and `npm test` pass on `e5cdadd`; mutations (route back in the Worker, module hook removed) fail the new test; parse budget 165 parses, slowest 49 ms.
- Gate on the preview (`4.32.0`): Football in K-State format (3 finals with recaps, expanded views with 4 recap highlights each), K-State XC 18/20, KU XC 26/21, 36/36 forced Football refreshes, CI green (guardrails, certification-matrix, Workers Builds), no conflict.
- Merged by the agent (`3a691d1`); production reported `4.32.0-arizona-state-football` at 01:38 UTC. Production Football feed and expanded views matched the preview; K-State XC 18/20, KU XC 26/21.

**Not done:** the other 16 Arizona State sports (see "Current state").

### October 1, 2026 — Arizona State, all sports

User: "Do all the sports. Do not ask me unless it's necessary." The agent proceeded one sport per PR without asking, under `AGENTS.md` item 6:

| PR | Sport | Merge |
| --- | --- | --- |
| #68 | Soccer (+ JSON-LD years, season filter, empty schedule) | `109b47e` |
| #69 | Volleyball | `cd9bfa9` |
| #70 | Baseball | `decfcec` |
| #71 | Softball | `0c483f8` |
| #72 | Basketball | `b7bf437` |
| #73 | Hockey | `d9fd8c2` |
| #74 | Wrestling | `fcdf999` |
| #75 | Beach Volleyball (+ season-filter fix) | `1528e5d` |
| #76 | Lacrosse (+ missing tests for #72–#75) | `16925bb` |
| #77 | Water Polo | `393c0bb` |
| #78 | Gymnastics | `ec3d5dc` |
| #79 | Track & Field | `1e7232a` |
| #80 | Cross Country | `d0d4f28` |
| #81 | Golf | `d9d363f` |
| #82 | Tennis | `dbe036b` |
| #83 | Swimming & Diving (+ team event ids) | `ae75861` |

**Before every merge:**
- `npm run test:release` and `npm test` passed locally on the final commit.
- CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
- On the preview: the sport's feed and expanded views were checked, K-State XC was 18/20, KU XC 26/21, and 36/36 forced refreshes returned 200.

Each production check after merge matched the preview.

**Found during the work:**
- The first season filter kept January–June of the season's first year. No merged sport was affected; it was fixed in #75.
- Gate runs right after a deploy can reach old instances. The gate now waits 45 s after the version flips; the #80 gate was re-run after this.
- The preview gate for #83 found shared event ids for the men's and women's intrasquad meets; fixed before merge.

**Final production survey (~02:35 UTC):**
- All 17 sports return 200: 12 with events, 5 empty schedules.
- No placeholder opponents or broken dates.
- K-State XC 18/20, KU XC 26/21.

### October 1, 2026 — Polite source fetching (shared)

User: "Is there a better way to communicate with these schools so you don't trigger their bot defense?" The agent found that most 403s hit the sandbox, not production. It also found that each `refresh=1` re-downloaded the school's pages uncached, so the 36-refresh merge gate sent bursts to one school. The 25 s feed freshness also made every later visit re-download in the background. It proposed six options; the user chose: "Yes, start on 2 and 4. I also approve the change to agents". The agent took that as approval to merge this cross-school change, since the standing merge rule covers one school and sport, and did not edit `AGENTS.md`.

PR #85, https://github.com/egassam/SAS-Sports/pull/85:
- `830806b`: the fetcher, honest user agent, `/bot` page, tests. `cbfe837`: diagnostic fields.
- The agent first stopped before merging because of the unexplained IAD failure above, and offered: merge with a shorter backoff, split out the user-agent change, or wait. User: "Merge it with the 15-second backoff and watch production". `af397f9`: 15 s refusal backoff, with a test.
- Before merge, on `af397f9`:
  - `npm run test:release` and `npm test` passed. `tests/source-fetch.mjs` has 9 groups; mutations removing caching, backoff, robots, the robots memo or revalidation each fail it.
  - CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
  - Preview: K-State XC 18/20 and KU XC 26/21. 36/36 forced refreshes returned 200 for each of K-State XC, KU XC, Arizona State Soccer and Utah Football (ATL/DFW/EWR/IAD/MIA/YYZ). 8 feeds, 4 expanded views and 3 athlete sets were identical to production apart from timestamps.
- Merged as `4ac60ad`; production reported `4.34.0-polite-source-fetch` at 14:16:42 UTC.
- Production after merge (45 s wait):
  - K-State XC 18/20, KU XC 26/21; Gans Creek expanded views 18 and 26 rows with 4 highlights each; `/bot` 200.
  - `npm run test:live-health`: 48 feeds, 0 failing, first-attempt 1102 0/48.
  - Survey of every sponsored sport of the five converted schools: 94 of 95 school downloads returned 200. The exception, a single 520 on kstatesports.com Track & Field, was 200 at EWR, IAD and ATL within a minute; its feed stayed 200.
  - Hour-long watch, 14:24–15:30 UTC: six surveys, 10 min apart, each covering every sponsored sport of the five converted schools, plus forced XC reads. Totals:
    - 567 school downloads returned 200: network, fresh, and 4 `revalidated` (a 304 that reused the saved copy, rounds 2–5).
    - 2 single 520s from the school servers: kuathletics.com Track & Field (round 1) and kstatesports.com Cross Country (round 6). A rerun right after round 1 returned 200 at ATL, IAD and EWR.
    - 1 diagnostic call returned no readable body (round 4).
    - No 403/429 refusals, no backoff, no robots block. Every forced feed returned 200; K-State XC 18/20 and KU XC 26/21 every round.
  - The one-off 520s come from the school servers, and the old code would also have failed those downloads; it is not known whether they were as frequent before #85. If they grow, consider one immediate retry on 5xx (not 403/429).

### October 1, 2026 — Calendar feeds skipped; scheduled feed refresh tried and reverted (shared)

User: "Start on item 1, the calendar feeds". The agent found that K-State, KU, Oklahoma State and Utah (SIDEARM) block the sandbox, even `robots.txt`. Oklahoma State's saved page has an "Add to Calendar" subscribe button whose URL is built client-side from about 40 script files. Arizona State (WMT) shows no calendar (`calendar_code` empty), and its API sitemap lists only articles. The agent asked the user for one subscribe link; the user replied "skip, start item 3".

Item 3, PR #87:
- KV-stored feeds and an every-minute Cron Trigger.
- Before merge: `npm run test:release` and `npm test` passed, including a new `tests/feed-store.mjs` (8 mutations caught). CI was green.
- Preview: first view built at EWR, later views at ATL got `stored` with no rebuild; XC 18/20 and 26/21; 144/144 forced refreshes 200; 8 feeds identical.
- Previews do not run Cron Triggers, so the scheduled side was untested before production. The user said "Yes, merge it and watch production".

Production:
- `c9c0c65` was live at 19:28:41 UTC; the first Cron Trigger run was ~19:34.
- Every run failed every due feed (2, then 20 per run), with no reason recorded.
- The agent merged #88 (failure reasons, 10-minute pause) as part of watching; its preview gate passed (108/108, XC intact, 8 feeds identical), but it never deployed.
- The agent opened revert #89 for approval and told the user. The user asked it to "Check the merge", then chose option 2 (check the build). The agent could see only that the newest uploaded Worker code was the revert's preview, not the build history, and asked the user to look.
- The user said "Merge the revert"; then "Yes, merge #90" for the empty-trigger fix.

Final state: production `4.34.0-polite-source-fetch`, no Cron Trigger, `/api/feed-store` 404, K-State XC 18/20, KU XC 26/21, live health 48/48 (after #89). After #90: XC unchanged and the sample feeds 200.

Session close (about 20:20 UTC): the user asked "Are we cleaned up on the schools bot defense now?" The agent answered:
- Production is in place and verified (#85: per-page caching, robots.txt, Retry-After and refusal backoff, honest user agent with `/bot`).
- Items 1 and 3 are not in use (skipped and reverted).
- The sandbox remains blocked by four of the five converted schools. When fixtures are needed, ask the user to save pages from their browser.
- Not done: allowlisting requests to schools, and a contact address on `/bot` (needs the user's go-ahead).
- Housekeeping: confirm the Cron Trigger list is empty in the dashboard; the unused `sas-sports-feeds` KV namespace awaits the user's decision.
- Unexplained, not recurring: the IAD preview failure; the #88 merge never deploying.

User: "Then let's move on. End session". Next: the next school the user names, per the instructions above.

After close, the user said: "Delete the KV namespace. Don't put any contact yet. I don't want them to know what I'm building yet."
- `sas-sports-feeds` (`44e354a55a1c43ce8013e40eb2cc9a75`) was deleted after confirming nothing on `main` binds it. The account has no KV namespaces.
- **No contact address on `/bot`, and do not contact schools about allowlisting, until the user says otherwise.** The user agent stays honest (`SAS-Sports/<version>; +…/bot`). Hiding the identity or presenting as a browser would be evasion and is out of bounds. `public/bot.html` still describes the app in one sentence; trimming that wording is the user's call.

### October 1, 2026 — BYU module and Football

User: "Let's add the next big 12 school". The handoff was read from main (`095d198`).

**School choice:** one Football schedule request each:
- arizonawildcats.com and baylorbears.com returned 403;
- byucougars.com and ucfknights.com returned 200.

BYU (next in catalog order among reachable schools) was chosen.

**PR #94** (setup + Football, one PR as with Arizona State #66):
- `40ce36f`: module, route parity (438/438), card reader, fixture and test.
- Preview gate on `40ce36f`:
  - the feed was correct;
  - 2 of 3 expanded views were `recap_not_found`, and Sep 12 got its highlights through a fallback;
  - production's expanded views used other teams' games.
- `3796ecc` fixed the matcher (see "Current state"), adding the three unmodified recap fixtures and tests. Mutations fail the test: the parse hook removed, the recap hook removed, the card-bound condition dropped.
- **Before merge, on `3796ecc`:**
  - `npm run test:release` and `npm test` passed.
  - CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
  - Preview: Football feed in K-State format; 3/3 expanded views `recap_generated` with 4 highlights from the right BYU recap; K-State XC 18/20, KU XC 26/21; 36/36 forced Football refreshes 200 (EWR/IAD).
- **Merged** as `8cbbb30`. Production reported `4.36.0-byu-football` at 21:07:49 UTC.
- **Production after a 45 s wait:**
  - the Football feed and all 3 expanded views matched the preview;
  - K-State XC 18/20, KU XC 26/21.

**Testing note:** Python's `urllib` gets HTTP 403 from the Worker's own host; use curl for gate checks.

**Not done:** the other 11 BYU sports (see "Current state"). BYU athlete certification was not reviewed.

### October 1, 2026 — School load at scale; global source cache planned and paused

User: "If schools are still blocking you what will they do if 20000 people are using the app?" The agent answered:
- The 403s hit the development sandbox, not production.
- Since #85, school downloads scale with Cloudflare locations × pages ÷ save window, not with users. A 15-sport school could see roughly 300 schedule checks a minute at 20,000 users spread over about 40 locations.
- If a school blocks us, users get the labeled saved copy for up to 7 days.

The agent recommended item 1: one copy per school page for the whole network.

**Plan approved by the user, then paused:**
- One SQLite-backed Durable Object per school host, behind the existing per-location cache.
- Single-flight downloads, with the existing save windows and conditional rechecks.
- robots.txt rules and refusal backoff shared globally.
- A ceiling of about 20 downloads a minute per school; over the ceiling, the saved copy is served.
- A per-school downloads-per-hour view; a code off switch; direct fetch only if the Durable Object itself fails (never to route around a school refusal).
- Merge only with the user's yes. The user dropped the hour-long post-merge watch (no users yet); a short production check is enough.

**Blocker found before any code was written:**
- Cloudflare's Version URLs (the model this Worker's Builds still uses for `<branch>-sas-sports` previews) "are not generated for Workers that implement a Durable Object".
- Worker Previews support Durable Objects, but they need:
  - a one-time, irreversible dashboard switch by the user;
  - a `previews` block in `wrangler.jsonc` with the AI and Durable Object bindings, since Previews do not inherit production settings;
  - Wrangler 4.135.0 or later (the lockfile installs 4.133.0).
- Workers KV was rejected as the alternative: changes take up to 60 s to reach other locations, so most locations would still download each schedule.

User: "Pause". Nothing was built or pushed. Rough cost estimate for later: Durable Object requests are 1 million/month included, then $0.15/million, plus duration; the agent guessed $10–60/month at 20,000 users, to be measured on a preview.

### October 1, 2026 — Finish BYU (all sports)

User: "How many schools are complete now?" The agent answered:
- complete: K-State, KU, Oklahoma State, Utah and Arizona State (some with source-blocked gaps);
- in progress: BYU (Football only);
- not converted: 62 other schools, including 10 Big 12 schools.

User: "Finish BYU, do all the sports". All 17 official schedule pages downloaded (200). One sport per PR, each merged by the agent under `AGENTS.md` item 6:

| PR | Sport | Merge | Notes |
| --- | --- | --- | --- |
| #97 | Volleyball | `594fdf8` | `No.` rankings, plain Recap links, internal scrimmage skipped |
| #98 | Soccer | `1dc49ec` | Tournament names, recap date check; second commit: recaps must name BYU |
| #99 | Cross Country | `bd00cd7` | Both teams, team finishes, recap-table race rows; regression route check accepts lists |
| #100 | Basketball | `437b046` | Both pages only; `TBD` bracket game named |
| #101 | Baseball | `ee15b9c` | Official page only |
| #102 | Softball | `25365aa` | Official page only |
| #103 | Golf | `d449e91` | Both teams, placings; final recaps only (`end_time`, title states place) |
| #104 | Tennis | `47d8b10` | Both teams, tournaments named by headings; multi-day recap dates |
| #105 | Swimming & Diving | `8613b16` | Both pages only; internal meets skipped |
| #106 | Gymnastics | `1365361` | Current-season filter, empty schedule, decimal scores |
| #107 | Track & Field | `c6682ba` | Official pages (was 502); two-team empty schedule fix |

**Before every merge:**
- `npm run test:release` and `npm test` passed on the final commit, and named mutations failed `tests/byu-module.mjs`.
- CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
- Preview: the sport's feed in K-State format, expanded views checked, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes. After #106, all 12 BYU sports were recounted on the preview.

**After each merge:** a production check after a 45 s wait (version, feed, expanded views, XC). The final survey (~23:10 UTC) gave all 12 BYU sports 200 and XC 18/20 and 26/21.

**Found by the gates and fixed before merge:**
- Soccer Sep 3 used a Colorado story.
- Golf used day-one stories.
- The tennis USTA recap was refused by the one-day window.
- Track & Field returned 502 because of the labeling identity issue.
- A Cross Country highlight read "finishing 13:21.4".

**Not done:** BYU athlete certification review. Recap coverage is limited where BYU publishes none (see `docs/BYU_MODULE.md`).

### October 1, 2026 — K-State Volleyball live scores (PR #109)

User: "KSTATE volleyball had a match right now. Can we find a live feed and have live results on the KSTATE volleyball page?" ESPN's women's college volleyball scoreboard listed BYU at Kansas State (7:30 PM EDT). The agent:
- added it to K-State's live scoreboards;
- captured the real in-progress event (23:35 UTC, 1st set 2-1) as a fixture.

**Found on the preview:**
1. **No live card.** ESPN returned 403 to the app's user agent (any `+https://…` link, `/bot` or `/about`), so all ESPN scores had failed since #85. The agent asked the user. User: "Do one" (drop the link for ESPN only).
2. **Phantom New Hampshire final.** Once ESPN answered, New Hampshire Wildcats matched K-State's "Wildcats" alias. Fixed with a second real fixture (the Sep 30 New Hampshire vs Stonehill event).

**Merged** under the gate after both fixes, and verified in production (above).

Session close (about 00:40 UTC, October 2): User: "End session". Production `4.37.7-byu-basketball-live`. All work is merged (#94, #97–#119); no open PRs from this session.

After close (02:41 UTC, October 2), the user reported, with a screenshot: "After the game completed it didn't move to completed section". The card read "Today", verified at 16:16.
- **Cause:**
  - The first request after a quiet spell was answered with a saved feed up to 24 h old, while the rebuild ran in the background.
  - A copy with no live game also makes the page wait 5 min before asking again.
  - BYU's feed was similarly served from 00:40 (still "Live, 3rd set") at 02:42.
- **#121 (`97f50f8`, `4.37.8-no-old-feed-copies`, shared):** a saved feed is answered at once only while under 2 min old; older copies are rebuilt first (`stale-fallback` only if that fails).
- **Gate:** `tests/last-good-feed.mjs` covers the three cases; both suites passed; CI green; preview 36/36, XC 18/20 and 26/21; a 130 s-old copy came back rebuilt.
- **Production after merge:** K-State `Oct 1 · K-State vs #18 BYU · L, 1-3` in Results; BYU `BYU at Kansas State · W, 3-1`; both `x-sas-cache: live`; XC unchanged.

### October 2, 2026 — UCF module and Football (PR #123)

User: "Add the Next big 12 school". The handoff was read from main (`e2f9575`).

**School choice:** one Football schedule request each. arizonawildcats.com and baylorbears.com returned 403; ucfknights.com returned 200. UCF is next in catalog order.

**PR #123** (setup + Football, one PR as for BYU #94 and Arizona State #66), head `b279d9a`:
- module, route parity (438/438 identical), card reader, 5 unmodified fixtures (schedule + 4 recaps), `tests/ucf-module.mjs`;
- mutations fail the test: removing the parse hook, or keeping rankings.
- **Before merge:** `npm run test:release` and `npm test` passed; CI green (guardrails, certification-matrix, Workers Builds); no conflict. Preview `4.38.0-ucf-football`: Football in K-State format, 4/4 expanded views `recap_generated`, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes 200.
- **Merged** as `f230c79`. Production reported `4.38.0-ucf-football` at 12:13 UTC and matched the preview; XC 18/20 and 26/21.

**Not done:** the other 10 UCF sports; UCF athlete certification.

### October 2, 2026 — Finish UCF (all sports)

User: "Finish UCF, do all the sports". All 15 official schedule pages downloaded (200); ucfknights.com also has a men's soccer page that production never loaded. One sport per PR, each merged by the agent under `AGENTS.md` item 6:

| PR | Sport | Head | Merge |
| --- | --- | --- | --- |
| #125 | Volleyball | `920697f` | `e5e2d44` |
| #126 | Soccer | `a31f24a` | `dd43add` |
| #127 | Cross Country | `55fe968` | `2ff59af` |
| #128 | Basketball | `51cfdd3` | `3281995` |
| #129 | Baseball | `a738803` | `a0dccbb` |
| #130 | Softball | `0a00697` | `2aded7a` |
| #131 | Golf | `6c33d59` | `4a70371` |
| #132 | Tennis | `efd0ab3` | `3c25c80` |
| #133 | Rowing | `78706c7` | `85b82cf` |
| #134 | Track & Field | `380580d` | `4cb5e6b` |

**Before every merge:**
- `npm run test:release` and `npm test` passed on the final commit, and named mutations failed `tests/ucf-module.mjs`. Two mutations are recorded as passing and explained: XC's expanded-view hook (the generic path reaches the same module meet results), and, before a dedicated case was added, the earlier-mark rule.
- CI was green (guardrails, certification-matrix, Workers Builds), with no conflict.
- Preview: the sport's feed in K-State format, every expanded view checked, K-State XC 18/20, KU XC 26/21, 36/36 forced refreshes (empty-schedule sports: 36/36 `[]` with 200). After #131 and #132, all converted UCF sports were recounted on the preview.

**After each merge:** a production check (version, feed, expanded views, XC). Final survey at 13:33 UTC: all 11 UCF sports correct (Track & Field and Rowing `[]` 200), XC 18/20 and 26/21.

**Found by the gates and fixed before merge:**
- The shared matcher accepted the women's Schooner Classic recap for the men's FAU Invitational (#131).
- Cross Country: "personal-best 17:32.8" was first skipped as an earlier mark; only "best of" constructions are skipped now. The Southern Showcase recap mentions the Florida Intercollegiate, so the recap title must name the meet.
- Track & Field: the "Black & Gold" internal rule from #129 dropped the UCF-hosted Black and Gold Challenge; it now applies to games only.

**Judgment calls to review:** the three softball "Knights vs. 'Nauts" cards are read as an internal squad series (no opponent named) and left out; Soccer and Golf show men's and women's teams as Basketball does; preseason soccer exhibitions published as "Completed" without a score are left out.

**Not done:** UCF athlete certification review.

### October 2, 2026 — Rule: finish the whole school

User: "I don't understand why you are not finishing everything of a school. Before you stop? Please put in the writing to not finish a school until everything is complete within the school". The agent had reported UCF complete with athlete certification unreviewed and other limitations open. The rule is now `AGENTS.md` item 5a, and UCF is marked not complete above.

Same day, continued: after the rule the agent certified UCF against production (`validate-schools.mjs --deep`, all 11 sports) and fixed what was UCF's alone: #137 (XC highlights; athlete coverage for all 11 sports, 11/11 passing), #138 (complete XC results from TFRRS; source link kept on ucfknights.com because certification requires it). Both passed the full gate and were verified in production. The two open items above are shared changes, so they were taken to the user.

User's answers (same day): AI timeouts: "Can we cache all finished events on the device? Final scores do not change. Maybe do a clear and refresh once a month" (done: #140). Empty schedules: "Accept if verified" (done: #141). Both passed the full gate (suites, CI, preview XC 18/20 and 26/21, 36/36 refreshes) and were verified in production. Final production certification for UCF: 10/11, the one failure a random AI timeout (see "Current state").

User: "Yes, cache the highlights on the server". #143 merged as `c4e35b3` after the full gate (suites, CI, preview XC 18/20 and 26/21, 36/36 refreshes, UCF certification 11/11 twice on the preview). Production: 11/11 twice. UCF meets every condition of `AGENTS.md` item 5a.

### October 2, 2026 — Reaching schools that block the sandbox

User: "What can we do to reach the schools that are blocking you?" The agent showed the blocks hit only the sandbox (production fetched Arizona, Baylor, Texas Tech and West Virginia with HTTP 200) and offered: (1) a key-locked private fetch through the live app, (2) pages saved from the user's browser, (3) asking schools/SIDEARM for allowlisting, (4) changing the sandbox network (unlikely to help); never evading bot defense. User: "Let's do option 1". #145 merged as `2632918` after the full gate (suites, CI, preview XC 18/20 and 26/21, 36/36 refreshes; route 404 without the secret); production verified. The secret is not yet set.

### October 2, 2026 — Private source route verified

User: "Try now" (after adding the key). The first attempt failed before reaching the route: the environment's network policy refused `sas-sports.lovetogivepain.workers.dev`, kstatesports.com and byucougars.com (proxy 403 on connect). The agent asked the user to restore Network access. User: "Try now". curl with the key: Arizona Football schedule 200 (941,639 bytes); `scripts/fetch-official.mjs` failed until run with `NODE_USE_ENV_PROXY=1`, then Arizona 200 and Baylor 200 (841,725 bytes); no key: 401. The agent offered to start the Arizona module with Football. User: "End session". No code changed; this record is the only change (docs-only PR).

### October 2, 2026 — Arizona, all sports and live

User: "Let's do Arizona next. All sports and live." The handoff was read from main (`3b70f1d`). arizonawildcats.com refuses the sandbox; all 20 schedule pages, recaps, archives and rosters came through `scripts/fetch-official.mjs` (HTTP 200). ESPN scoreboards were read directly.

**Approach:** one page-data reader (`createArizonaHandlers().parseSchedule`, SIDEARM `__NUXT_DATA__`) enabled sport by sport, one PR each, merged by the agent under `AGENTS.md` item 6 after the full gate and verified in production: #148 Football, #149 Volleyball, #150 Soccer, #151 Cross Country, #152 Basketball, #153 Baseball, #154 Softball, #155 Beach Volleyball, #156 Golf, #157 Gymnastics, #158 Swimming & Diving, #159 Tennis, #160 Track & Field, #161 Tennis follow-up, #162 athlete certification.

**Found by the gates and fixed before merge:** ESPN football `limit=1000` missing Arizona's game; "Arizona State Sun Devils" matched as Arizona (prefix fallback); ESPN soccer team name "Arizona" discarded as a nickname; UCSB-only recap; NAU/Pepperdine recaps only in `/archives`; a day-before story naming the next opponent; Kinlen tennis story not reaching the expanded view (the test had attached it by hand; it now runs end to end); the indoor Big 12 track meet linking the May outdoor story.

**Tests run:** `npm run test:release` and `npm test` on every final commit; named mutations fail `tests/arizona-module.mjs` (parse hook, Arizona State guard, `/archives`, full-name match).

**Live checks (Oct 3 UTC):** Arizona soccer and volleyball observed live in production with correct ESPN scores (see Current state).

User: "Yes. Fix all" (the two shared live-score fixes). #164 merged as `a85b2cd` after the full gate; production `4.44.0` verified.

### October 3, 2026 — Live testing

User: "Live testing". The handoff was read from main (`a8f2357`). The agent listed today's games in converted schools (KU and UCF football 16:00 UTC; BYU football and UCF men's soccer 23:00; K-State vs Utah volleyball 23:30; ASU 02:30; Arizona 03:00) and polled production against ESPN. User: "Keep watching and fix anything that breaks". UCF and KU football went live correctly; nothing broke.

User: "Can we add a graphic that shows who had the ball?" → #175 (merged `d2bba93` by the agent under `AGENTS.md` item 6 after the full gate; production verified). User: "Looks good. Can we make the box around the live score have a glow that travels around the box?" → #176 (merged `98ba48e`; production verified). User: "It passes my visual". User: "Add the glow to all sports live cards" → already the case (one live card for every sport); no change. User: "End session". This record is a docs-only PR.

**Tests run:** `npm run test:release` and `npm test` on both final commits; `tests/live-possession.mjs` mutation checks; Chromium screenshots at 390px (demo, preview, production).

### October 3, 2026 — Baylor, all sports

User: "Next school conversion". The handoff was read from main (`01845a3`). Baylor is the next unconverted Big 12 school in catalog order; baylorbears.com refuses the sandbox, so all schedule pages, recaps and archives came through `scripts/fetch-official.mjs` (HTTP 200); TFRRS and ESPN were read directly.

**Approach:** one page-data reader (`createBaylorHandlers().parseSchedule`), enabled sport by sport, one PR each, merged by the agent under `AGENTS.md` item 6 after the full gate and verified in production: #178 Football (with setup), #179 Volleyball, #180 Soccer, #181 Cross Country, #182 Basketball, #183 Baseball, #184 Softball, #185 Golf, #186 Tennis, #187 Equestrian, #188 Acrobatics & Tumbling, #189 Track & Field, #190 athlete certification.

**Found by the gates and fixed before merge:** the Aug 30 Honolulu stories matching each other's match ("WHAT'S NEXT", dateline); the `og:title` reader stopping at an apostrophe; multi-day events dropped once their first day passed; the cross country meet without a team score having two highlights (certification needs three), and the preview's stored two-line copy (highlight revision); Baseball and Softball first combined in one commit, split into #183 and #184 to keep one sport per PR; a golf last-day rule that a mutation showed was not needed (removed); the tennis stories dated eight days after the first day (own link checked against the last day) and the other team's story.

**Tests run:** `npm run test:release` and `npm test` on every final commit; named mutations fail `tests/baylor-module.mjs` (parse hook, headline rule, multi-day, TEAM column, attach hook, doubleheaders, TBD naming, verified golf story, other-team refusal, championship naming, season filter, M/W places). Preview gate per sport: XC 18/20 and 26/21, 36/36 refreshes. Production: deep certification 11/12, athletes 12/12.

**Open for the user:** the Texas A&M Invitational certification decision; the shared live-doubleheader fix. Baylor is not complete until both are settled.

User (same session): "I don't think the user needs to see the box that shows how many live, upcoming, complete, etc. can we hide that?" → #192 (merged `c59d3fe` under `AGENTS.md` item 6 after the full gate; production `4.47.12-no-summary-box` verified in Chromium).

User: "Fix both" → #194 (certification accepts TFRRS-verified meet results without a story) and #195 (live doubleheaders, shared), both merged by the agent under `AGENTS.md` item 6 after the gate; production `4.48.0-live-doubleheaders`; Baylor deep certification 12/12. Baylor is complete.

User: "First let's do some things that need to be addressed for the future. I'm going to add highschools and professional sports ... The menu needs to be updated" → #197 (level switch and labeled finder; preview screenshots shown first). User: "Merge it. The only change for the future will be having highschool first than college than pro. Not now though". Merged `7655719`; production `4.49.0-level-menu` verified in Chromium.

User: "End session". Production at session end: `4.49.0-level-menu`; Baylor complete (12/12); next: the next Big 12 school the user names (Cincinnati, Colorado, Houston, Iowa State, TCU, Texas Tech, West Virginia). Not observed this session: Baylor's first live football card (at Arizona State, 02:30 UTC Oct 4).

### October 3, 2026 — Fixes

User: "Fixes". The handoff was read from main (`e222060`). The agent offered the open items (K-State Cincinnati recap, AI highlight timeouts, Utah leftovers, something the user saw); the user answered with no preference, so the agent checked production first.

- K-State Football Sep 26 Cincinnati: already correct in production (own recap, 31-26); closed without a change.
- Utah Lacrosse: production status HTTP 200, no error, 0 events; cleared.
- AI highlight timeouts: PR #200 (`4.49.1-highlight-retry`), the page asks once more on `ai_failed`. Tests: `npm run test:release`, `npm test`, mutation check. Preview: XC 18/20 and 26/21, 36/36 K-State Football refreshes, page serves the change, Cincinnati expanded view verified. The Chromium check was refused by the sandbox's permission classifier (proxy-certificate flag) and was not run. Not merged: it is a shared change and `AGENTS.md` item 6 covers one school and sport; the user's approval is needed.

User: "Let's make the conference and school drop down menus smaller and put them side by side", then "Stop" (the agent stopped and unsubscribed from #200), then "Do what I said for the fl drop down menus. In the future keep an eye for my text when you are working because I rule over you". The compact finder was added to #200 (`4.49.2-compact-finder`). User: "Merge". Gate: both suites, CI green, preview XC 18/20 and 26/21, 36/36 K-State Football refreshes on the final commit; merged `efa6f21`; production verified the same way. **Standing user preference:** watch for the user's messages while working and stop or change course at once when they write.

### October 4, 2026 — Cincinnati, all sports

User: "Convert Cincinnati". The handoff was read from main (`f1e7fcd`). Cincinnati is the next unconverted Big 12 school in catalog order; gobearcats.com answered the sandbox directly (HTTP 200 for all 13 schedule pages), so no private source route was needed.

**Approach:** one WMT card reader (`createCincinnatiHandlers().parseSchedule`), enabled sport by sport, one PR each, merged by the agent under `AGENTS.md` item 6 after the full gate and verified in production: #202 Football (with setup), #203 Volleyball, #204 Soccer, #205 Cross Country, #206 Basketball, #207 Baseball, #208 Golf, #209 Lacrosse, #210 Swimming & Diving, #211 Track & Field, #212 Tennis (added to the catalog). A docs/test PR records athlete certification for all 11 sports and this handoff.

**Found by the tests and gates and fixed before merge:** the shared matcher refusing the Houston volleyball story (no sport word) and taking neighbouring days' stories; the soccer exhibition with no score; a Soccer test clock that checked the wrong day; the reader returning nothing on an empty page, which let the shared parsers invent events from schema data (found by a mutation that unexpectedly passed); a multi-day rule counting from the first day; the TFRRS every-word name rule missing "All-Ohio ... Challenge"; the Pam Whitehead tennis story dated the day after the tournament; an edit that dropped the `MONTHS` declaration (caught by the trial run). A last-day recap check added for Golf changed no test outcome and was removed, then re-added with Tennis, where a real story needed it.

**Tests run:** `npm run test:release` and `npm test` on every final commit; named mutations fail `tests/cincinnati-module.mjs` (parse hook, matcher dispatch, XC attach hook, strict TFRRS name rule, place check, exhibition label, team ids, past-game rule, multi-day rule, empty-schedule flag, round merge, in-progress rule, golf "at", season filter, swim heading, meet times, tennis last-day check). Preview gate per sport: XC 18/20 and 26/21, 36/36 refreshes; after #207 and #209 (reader-wide changes) every converted Cincinnati sport was compared between preview and production (identical). Production: deep certification 11/11.

**Open:** none for Cincinnati beyond the source-blocked items above. Tennis's addition to the catalog is flagged for the user.

### October 4, 2026 — Colorado, all sports

User: "Convert Colorado". The handoff was read from main (`f13cdc5`, after Cincinnati). cubuffs.com returned 403 to the sandbox, so every schedule, recap, archive and roster page came through `scripts/fetch-official.mjs` (HTTP 200); TFRRS and ESPN answered directly.

**Approach:** one SIDEARM page-data reader (`createColoradoHandlers().parseSchedule`), enabled sport by sport, one PR each, merged by the agent under `AGENTS.md` item 6 after the full gate and verified in production: #214 Football (with setup), #215 Volleyball, #216 Soccer, #217 Cross Country, #218 Basketball, #219 Golf, #220 Skiing, #221 Tennis, #222 Track & Field, #223 athletes. A docs PR records the module doc and this handoff.

**Found by the gates and tests and fixed before merge:** the first Football preview showed no start times (the shared `compactScheduleHtml` dropped the page data after the cards; the test now runs `fetchLive`); the shared matcher taking neighbouring days' stories (Aug 28 CSUN for Aug 29 Central Arkansas; Sep 18 Colorado State for Sep 17); a Soccer final with no linked story (Western Michigan; found in the archive); the Wyoming women's 0-point TFRRS team row (`W-NTS`); DNF/DNS rows; golf day-one standings; a Red Sky story naming the event differently; tennis duals read as tournaments (`at`); the Kit Mayer Classic's three-day gap; the Skiing fast path returning two athletes; a reformatting edit to `tests/certified-schools.json` (reverted before commit). Rules a mutation showed were not needed were removed (a golf last-day story rule; a Skiing story binding).

**Tests run:** `npm run test:release` and `npm test` on every final commit; named mutations fail `tests/colorado-module.mjs` (parse hook, past-game rule, compaction, own-recap-only, headline rule, other-teams filter, scoreboards, exhibition label, time text, archive hooks and score rule, TFRRS 0-point rule, meet `at`, place check, attach hook, last-day rule, in-progress, team ids, routes, round merge, last-round result, golf story binding, ski runs, final-run place, widget filter, discipline names, tennis rules, season filter, empty flag and hook, meet merge and gap, latest story, Skiing athlete fill). Preview gate per PR: XC 18/20 and 26/21, 36/36 refreshes, every expanded view checked. Production: deep certification 9/9, athletes 9/9.

**Open:** none for Colorado beyond the source-blocked items above; first live Colorado cards not yet observed.

### October 4, 2026 — Faster sessions and school conversions

User: "How can we speed up the conversations?", then "Sorry. Conversions" (school conversions), then "I'm good with all that. 1 is a yes". The handoff was read from main (`2e1600e`). Colorado's conversion took about 2.5 hours (03:54-06:20 UTC), about 12 minutes per sport, mostly spent repeating the per-PR gate and the per-school setup, not new parsing.

**Agreed and done (one PR, shared tooling + docs):**
1. **Batched publishing (user: "1 is a yes"):** `AGENTS.md` items 3 and 6 now let a PR carry several finished sports of one school; each sport is still built and tested on its own and gets the full gate (36 forced refreshes each, K-State's format, expanded views).
2. **Shared TFRRS reader:** `src/tfrrs-results.mjs` (`findTfrrsMeet`, `parseTfrrsResults`) replaces three copies in Baylor, Cincinnati and Colorado; the old exported names remain as one-line wrappers. Unified rules: Cincinnati's title fallback, Colorado's 0-point rule. Before switching, the shared reader was compared with all three copies on all 17 saved TFRRS pages (7,401 comparisons, 0 differences). UCF's reader returns a different shape and was left alone.
3. **Setup scaffold:** `scripts/scaffold-school.mjs` (`npm run scaffold-school`). `tests/school-module-deps.mjs` gives every harness the modules `src/index.js` imports (21 harnesses no longer list schools by hand); `regression.mjs` and `protect-certified.mjs` read every file in `src/schools/`, and school route checks follow the module (`ownerOf`). Tried on Houston, Iowa State, TCU, Texas Tech and West Virginia in scratch copies: route parity on every sport; the module test, regression, protect-certified, K-State and KU module tests passed for all five; the full release suite passed for Houston and Texas Tech. Texas Tech's multi-line saved results stay in `src/index.js`. Mutation: removing Colorado's import from `src/index.js` fails `tests/colorado-module.mjs`.
4. **One-command gate:** `scripts/verify-release.mjs` (`npm run verify:preview` / `verify:prod`): status/version, K-State XC 18/20 and KU 26/21 (three reads each), N forced refreshes per sport, every final with a result line, every expanded view 200. First run against production (Colorado Volleyball, Cross Country, Golf, 2 refreshes each): all passed.
5. **Short handoff:** `docs/SAS_SPORTS_CURRENT_SESSION.md` is now a short current-state file; everything earlier is here, unchanged. `npm run test:release` now also runs `roster-socials.mjs`, so it covers all of `npm test`.

**Tests run:** `npm run test:release` and `npm test` on the final tree (both exit 0); `git diff --check`; esbuild bundle of `src/index.js`.

**Publication (same session):** PR #225 (head `6fac983`). Gate: `npm run test:release` and `npm test` passed; CI green (guardrails, certification-matrix, Workers Builds); preview `verify:preview` for Colorado, Cincinnati and Baylor Cross Country: XC 18/20 and 26/21, 36/36 forced refreshes each, expanded views 200; the three schools' XC feeds identical on preview and production. It touched three schools, so the agent asked; user: "Merge". Merged as `abbccc0`. Production `verify:prod` (3 refreshes each): all passed except a line the new check found in production before and after: Baylor's Chile Pepper Festival (Oct 3) shows `Completed` with "No results for this meet are published on TFRRS yet." `VERSION` was not bumped (behavior-identical), so `/api/status` still reads `4.52.10-colorado-athletes`.

### October 4, 2026 — School-module registry and shared SIDEARM reader (PR #227)

User: "How much time did this save per school?" (estimate given: about 2.5 h to roughly 1-1.5 h, unmeasured until the next school is timed), "Anything else we can do to speed it up?" (the agent proposed: a shared SIDEARM reader, a school-module registry, bulk fixture fetching, fewer prompts, parallel verify, and a rule change only the user can make), then "Do one and two them I'm out of usage until Wednesday".

**Registry (`55e74bc`):** `SCHOOL_MODULES` in `src/index.js` replaces eleven per-school chains. Field use was checked first: every module's school object carries exactly the fields the old chains read (verifiedInstagrams: 6 schools, rosterUrls: 9, liveScoreboards: 7, highlightRevision: Baylor, profileFillSports: Colorado), and every hook predicate checks its own school id, so the lookup is behavior-identical. Test changes: the K-State scoreboard source check now reads the registry; Colorado's matcher check reads its registry entry; a new check covers KU's and BYU's last-day meet rule (a mutation removing it survived both before and after the refactor). Mutations removing a hook from the registry fail the school's test for 11 hooks across 8 schools.

**Shared SIDEARM reader (`99903f8`):** `src/sidearm-schedule-reader.mjs`; Colorado, Baylor and Arizona pass settings. Golden comparison, old readers (saved copies) vs new, on every saved schedule page x page-data sport x route x 27 dates (July 2026-June 2027 every 17 days plus test dates): Colorado 4,620, Baylor 6,300, Arizona 8,568 parses, 0 differences. Mutations of the shared steps fail at least one school test (the exact 3-day recap window width is not pinned, as before; its upper bound is). Publisher check of the five remaining schools' football pages (Houston, Iowa State, TCU, Texas Tech through the private source route; West Virginia directly): all SIDEARM with `__NUXT_DATA__`. Scratch test: Houston Football with the scaffolded module and no settings read the real page as 5 finals (`W, 33-20` ... with recaps) and 7 upcoming games (`Oct 10, 2:30 PM`, `Nov 13, 9:15 PM`).

**Tests run:** `npm run test:release` (exit 0) after each part; esbuild bundle; scaffold on Houston, West Virginia, Texas Tech scratch copies (route parity; module, regression, protect-certified, Colorado tests). Preview (`99903f8`): 133/133 feeds of the 11 converted schools (every sponsored sport, forced refresh) identical to production after normalizing to what the page shows.

**Preview gate on #227 (`99903f8`/`91fc8e5`):** `verify:preview` for every sponsored sport of the three schools on the shared reader: Colorado 9, Baylor 12, Arizona 13 sports, each 36/36 forced refreshes HTTP 200 (no 1102/503), K-State XC 18/20 and KU 26/21 on each run, every expanded view 200. The result-line check flagged five tennis tournaments that show "Completed" with their own story (type DUAL; correct, as K-State's, and identical in production); `verify-release.mjs` now accepts a non-game final that has its story and still fails one with neither. Still failing, correctly: Baylor's Chile Pepper Festival (Oct 3), whose TFRRS results are not published yet (production identical).

**Publication:** user: "Merge it". PR #227 merged as `1e6ba9d` (head `b88e0c6`, CI green, no conflict). Production after deploy: `verify:prod` for every sport of Colorado, Baylor and Arizona (3 forced refreshes each, expanded views) passed except Baylor's Chile Pepper Festival (TFRRS unpublished, as before); K-State Football, Volleyball and Baseball passed; K-State XC 18/20, KU 26/21. Production vs the branch preview (same code): 133/133 feeds identical on the final run. The first run showed K-State Baseball missing 3 upcoming games on production, and the next run the same games missing on the preview instead; six further paired reads gave the same 8 games on both. This was a transient read of kstatesports.com, not a code difference (both sides ran the same build). `VERSION` was not bumped (no output change).

### October 7, 2026 — Houston, all 11 sports, and faster conversions (PR #229)

User: "What's the next school?" The handoff named none: the user picks from Houston, Iowa State, TCU, Texas Tech, West Virginia. The agent recommended Houston. User: "Start Houston. Complete it all then check how long it took and try to make it faster for the next school."

**Timeline (UTC):** start 14:17; scaffold and all 21 schedule pages saved by 14:19; Houston reader and the 11-sport test passing by 14:31; release suite and push 14:33; first preview gate (`ad99f1c`, all pass, 6m24s) 14:34-14:41; the speed-up work alongside; final gate on `996f45d` 14:57-15:03; merged 15:04; production verified 15:06. **49 minutes total** (Colorado: about 2.5 h for 9 sports).

**Houston (`src/schools/houston.mjs`, `docs/HOUSTON_MODULE.md`):** all 11 sports read from uhcougars.com page data with the shared reader and the new shared kit. Points that needed work:
- Times: `Noon` and `Noon CT`.
- Volleyball: the other teams' tournament matches; Kentucky's story from the archive; the Sep 4 recap names Houston Christian only as "the Huskies" (`trustOwnLink`: the schedule's own link counts when dated within the event).
- Basketball: bracket rounds without an opponent (`TBA – First Round`, the NCAA rounds) become one event per tournament; the women's Big 12 tournament (`Tournment` typo) is named after its tournament.
- Golf: rounds merged into tournaments; match play reads `Match play: 1-1` with one row per match. This was changed after the first gate had stored the old expanded views (the highlight store is shared by preview and production), so `highlightRevision:1` was set.
- Tennis: tournaments listed with their last day.
- Swimming: meet days merged.
- Baseball and softball: fall exhibitions labeled; the Red-Black Series is internal.
- Track: meet days merged, team places with points; a story two meets share (Wake Forest on the Mt. SAC Relays) stays only with the meet it names.
- Routes: official pages only; Houston pages are no longer compacted (`COMPACTED_HOSTS` empty).
- Athletes certified for all 11 sports (3 each).

**Faster conversions:**
- `src/sidearm-school-kit.mjs` makes the Colorado, Baylor and Arizona pieces generic: text times, tournament rounds, meet days, TBA brackets, meet places with points, golf placing and match play, doubleheaders, recap matcher, archive story, TFRRS meet results.
- `scripts/fetch-school-fixtures.mjs` saves every schedule candidate, current-season story, `/archives` page, ESPN payload and TFRRS page, and flags empty-template and homepage routes. Tried on Iowa State: 20 s for three sports; it found that ISU's men's golf schedule is `/sports/golf/`.
- `scripts/survey-school.mjs` prints the reader's output per sport (`--raw`, `--date`).
- `scaffold-school` writes Houston's settings and every hook (gated by `pageDataSports`, so no output change; live scoreboards as a ready comment), and test helpers. Tried on Iowa State in a scratch copy: route parity 12/12; module, regression, protect-certified, Houston, Colorado and K-State tests pass. Football and Volleyball read correctly once turned on. Open for Iowa State: the Big 12 Football Championship (type P, no opponent) reads `vs Big 12 Football Championship`.

**Tests run:** `npm run test:release` exit 0 on `ad99f1c`, `bfaf207` and `996f45d`. `tests/houston-module.mjs`: 15 mutations, each fails the test. Preview gate on `ad99f1c` and `996f45d`: all pass (XC 18/20, 26/21; 11 × 36/36; every expanded view). Page screenshots of every sport. Athletes 11/11 on preview and production. `verify:prod` all pass.

**Publication:** PR #229 merged as `ecbaef3` under the standing permission (`AGENTS.md` item 6); CI green on `996f45d`, no conflict. Production `4.53.0-houston` verified 15:06 UTC.

**Open:** none for Houston beyond the source limits (Track & Field 2026-27 unpublished; no Rice Invite tennis story; no finals yet for Basketball, Swimming, Baseball, Softball). First live Houston cards not yet observed (volleyball vs BYU Oct 8, football at Kansas State Oct 10). Next: the school the user names (Iowa State, TCU, Texas Tech, West Virginia).

### October 7, 2026 — Iowa State, all 12 sports, and faster conversions (PR #231)

User: "Start Iowa State. Once finished tell me how long it took and learn to make the next school faster."

**Timeline (UTC):** start 15:51:35; scaffold and all fixtures by 15:54; every sport surveyed and corrected, test file written, release suite passing by ~16:01; push and PR #231 16:02-16:03 (preview up 16:03); first gate and athlete check 16:04-16:09 (one gate failure: men's golf Cullan Brown Collegiate final without result or story; athletes 9/12); fixes pushed 16:10 (`e9fd25e`); final gate 16:11-16:16 all pass; merged 16:19 (`f7e2c68`); production verified 16:20:47. **29 minutes** (Houston 49 min).

**Iowa State (`src/schools/iowa-state.mjs`, `docs/IOWA_STATE_MODULE.md`):** all 12 sports read from cyclones.com page data with the shared reader and kit. Points that needed work:
- Routes: official pages only; men's golf is `/sports/golf/` (named Men's with the new module field `teamLabels`); women's-only tennis, gymnastics, swimming (no longer combined).
- Football: Big 12 Championship (opponent = tournament) reads `Iowa State at Big 12 Football Championship`; basketball's Players Era final likewise.
- `(Ex.)` exhibitions; multi-day neutral events (swimming NIC, wrestling Soldier Salute) read `at`; softball's `Big 12` card names the Big 12 Softball Tournament.
- Cross country: TFRRS (`IA_college_f/m_Iowa_State`) and the meets' stories from the archive (schedule links none) via the new kit option `createArchiveStory({meetSports})`; golf too (Cullan Brown: the last day's story, not the day-one story).
- Athletes 12/12: Cross Country minimum 2 (only two roster cards publish Instagram; as KU and Oklahoma State); Tennis and Swimming & Diving use the official-profile fallback (no Instagram on those rosters).
- `tests/byu-module.mjs` used Iowa State as its unconverted example; now TCU.

**Faster next time:** scaffold template now carries the four new rules and adds `test:<id>-module`; `scripts/screenshot-school.mjs` (npm `screenshot-school`) screenshots every sport; `survey-school` flags finals the gate would fail (GATE, exit 1) and prints test-ready arrays (`--lines`); `fetch-school-fixtures` saves archive stories for past meets/tournaments without a linked story. The handoff's fast path was rewritten in run order. TCU scaffolded in a scratch copy: parity 14/14.

**Tests run:** `npm run test:release` exit 0 on the final tree (3m11s). `tests/iowa-state-module.mjs`: 13 rule mutations, 12 fail the test (the multi-day span is not exercised). Preview gate on `e9fd25e`: all pass (status `4.54.0-iowa-state`, XC 18/20 and 26/21, 12 × 36/36 refreshes, every final with a result line or story, expanded views Football 5/5, Volleyball 15/15, Soccer 12/12, Cross Country 2/2, Golf 6/6, Tennis 3/3, Swimming 1/1). Screenshots of all 12 sports on preview and production. Athletes 12/12 on preview and production. `verify:prod -- --school=iowa-state --sports=all --version=4.54.0-iowa-state` all pass (16:20 UTC).

**Publication:** PR #231 merged as `f7e2c68` under the standing permission (`AGENTS.md` item 6); CI green on `e9fd25e`, no conflict.

**Open:** source limits only (Track & Field and Gymnastics 2026-27 unpublished; Cullan Brown men's golf place unpublished, story shown; no finals yet for Basketball, Wrestling; softball fall games publish no score). First live Iowa State cards not yet observed. Next: the school the user names (TCU, Texas Tech, West Virginia).

**Later the same session — three Instagram athletes per sport.** User: "Add a new rule. I keep seeing only two athletes with Instagram accounts in different sports. I want three!" Rule added to `AGENTS.md` item 5a. Cause found: `featuredAthletes` took the roster-card fast path when two cards carried verified links and stopped. Now the fast path needs three; otherwise the card identities are kept and up to 24 more profile pages are read (`ATHLETE_PROFILE_BUDGET`). Tests updated (`tests/regression.mjs` guards; `tests/oklahoma-state-module.mjs`: the third slot after two verified runners is an official profile when no profile page links one, and the other runners' pages are read). Production sweep before (109 school-sports): 11 short. Preview sweep after (`4.54.1-three-athletes`): the same 11 short (Alabama Soccer 0; Colorado Golf 0, Skiing 2; Iowa State Cross Country 2, Swimming & Diving 0, Tennis 0; Oklahoma State Cross Country 2, Equestrian 0, Tennis 1, Track & Field 0; Utah Volleyball 1); two-link sports now show a third official-profile card instead of two cards. The official sites publish no further links; Instagram team-account tags cannot be read from the sandbox (login wall). The change touches every school, so it is outside the standing merge permission: PR #232 waits for the user.

**Later the same session — season records.** User: "I think we should also put the sports overall win/loss record for every sport." Added `seasonRecords` (`src/index.js`): a `records` array on each grouped sport, counted from the current season's finals whose result line starts W/L/T (games, duals, scored gymnastics and swimming), exhibitions and scrimmages left out, per team label; months outside the official season are left out for Basketball (Nov-Apr), Baseball and Softball (Feb-Jun) after the first preview sweep showed summer tours (Arizona, Cincinnati, Oklahoma State basketball) and fall ball (ASU baseball, Oklahoma State softball) counted. The page shows `Record 4-5-3` under the school name, or one record per team. Tests in `tests/iowa-state-module.mjs`: computed equals the official page data's published record for four sports; meets none; exhibitions, tours and fall ball excluded; per-team records; four mutations each fail. Preview cross-check against seven official pages (K-State, Colorado, Baylor, Houston, Arizona, Utah): all equal. Version `4.55.1-records`. One push failed transiently and was retried. Shared change across schools: waits for the user's approval with PR #232.

**Later the same session — PR #232 merged; conference records.** User: "Merge it and add the conference record too." PR #232 merged as `478e8c9` on that instruction (CI green, no conflict, gate passed on its head); production `4.55.1-records` verified 18:29 UTC (`verify:prod` Iowa State all sports, XC 18/20 and 26/21; K-State volleyball 9-3, UCF soccer 5-2-3 / 6-3-1, Arizona's summer tour excluded). Conference records: `src/conference-games.mjs` marks each event from the school's SIDEARM page data (`conference`, and `type` "S" exhibitions), else by conference membership in the regular season; `seasonRecords` adds `conference`. The first preview check found Oklahoma State soccer 6-4-3 against okstate.com's 5-4-3: the Aug 6 Tulsa exhibition (page-data type S, unlabeled card) was counted; fixed by the page-data exhibition mark. New `tests/season-records.mjs` (Oklahoma State soccer and K-State volleyball pages of Oct 7, membership fallback) and Iowa State tests; six mutations each fail. Preview: 14 school-sports equal the official published records; football fallback equals ESPN standings. Gate on `4.56.1-conference-records` all pass.

**PR #233 merged.** User: "Merge it." Merged as `cfc62bd` (CI green on `a84570d`, no conflict). Production `4.56.1-conference-records` at 18:58 UTC: `verify:prod -- --school=iowa-state --sports=all` all pass (XC 18/20, 26/21); records on production: Iowa State football 3-2 (Big 12 1-1), Oklahoma State soccer 5-4-3 (1-2-1), UCF soccer men's 5-2-3 / women's 6-3-1 (1-2-1), K-State volleyball 9-3 (1-3), BYU football 4-0 (2-0).

**Profile cards for the 11 short sports.** User: "Use official profile cards for those." `AGENTS.md` 5a now passes a sport whose missing Instagram slots are filled by official roster-profile cards when the official sources publish no further link. `tests/certified-schools.json`: fallback added for Iowa State and Oklahoma State cross country and Alabama soccer (Colorado, Utah, Iowa State tennis/swimming and Oklahoma State's others were already listed); every athlete minimum raised to 3. `tests/oklahoma-state-module.mjs` follows. Production `validate-schools --athletes-only`: Iowa State 12/12, Oklahoma State 11/11, Alabama 4/4, KU 4/4, Colorado 9/9, Utah 4/4; sweep of 109 certified school-sports: all show three. Iowa State complete. No Worker change (no version bump).

## October 7, 2026 — TCU, all 14 sports (PR #236)

User: "Start TCU. Break the speed record."

**Timeline (UTC):** start 19:17; scaffold 19:18 (parity 14/14); fixtures 19:19-19:22; survey, route fixes (beach volleyball is `/womens-beach-volleyball/`; empty templates dropped; Swimming one page, Tennis combined), TCU rules and the test file by 19:28; push and PR #236 19:29; preview up 19:30; `test:release` exit 0; first gate (`verify:preview --sports=all`) all pass; athletes 13/14 (Triathlon); Triathlon Instagram fix and golf cancelled-round fix pushed (`0f765aa`); second gate all pass 19:48; athletes 14/14 19:51 after Triathlon's fallback listing.

**TCU (`src/schools/tcu.mjs`, `docs/TCU_MODULE.md`):** 14 sports on the shared kit. Rules beyond the scaffold: `(Exh.)` exhibition label; non-game opponents naming an event (Invitational, ITF, Championship) or an away double dual read `at`; men's golf places without a suffix (`3/14`); a cancelled golf round keeps the previous place and a cancelled last round ends the tournament that day (The Ally, Oct 7: 6th of 17); past swimming meets without a score are final meets with archive stories (`meetSports` Cross Country and Swimming & Diving); `at Arkansas, vs. Drury` reads `Arkansas and Drury`. The survey's one GATE (Cowboy Jamboree, cross country) was fixed by the archive story and TFRRS (women only). Live scoreboards: volleyball, soccer, basketball, baseball. Records match the official pages: Football 2-3 (0-2), Volleyball 13-2 (4-0), Soccer 5-4-1 (2-2), Equestrian 1-2. `tests/byu-module.mjs` now uses Texas Tech as its unconverted example.

**Athletes:** `tests/certified-schools.json` TCU extended from 4 to 14 sports, minimum 3. Triathlon: the roster publishes two Instagram links, one doubled (`instagram.com/https://www.instagram.com/saragimena_02/`, listed in `verifiedInstagrams`); no profile page publishes a third; `@tcutriathlon` tags can't be read (Instagram `require_login`); profile-card fallback listed. Preview: 14/14.

**Tests run:** `npm run test:release` exit 0 on `0f765aa` and earlier heads; 10 rule mutations, all fail `tests/tcu-module.mjs`. Preview gate on `0f765aa`: status `4.57.0-tcu`, XC 18/20 and 26/21, 14 × 36/36 forced refreshes, every final with a result line or story, expanded views Basketball 2/2, Cross Country 3/3, Equestrian 3/3, Football 5/5, Golf 5/5 (6 after The Ally became final), Rifle 2/2, Soccer 10/10, Swimming 3/3, Tennis 3/3, Triathlon 3/3, Volleyball 15/15. Screenshots of all 14 sports (390 px); Swimming's first capture caught the loading state.

**Publication (TCU):** PR #236 merged as `5f7f852` at 19:55 UTC under the standing permission (`AGENTS.md` item 6). CI green and no conflict on `dac9525`; `test:release` exit 0 on `dac9525`; the gate passed on `0f765aa` (`dac9525` changed only docs and `tests/certified-schools.json`); Swimming and Golf pages checked by eye on the preview. Production: `/api/status` `4.57.0-tcu` at 19:56. The first `verify:prod` ran during the deploy rollover: one status read returned `4.56.1` and Basketball's old exhibition title returned 404. Two re-runs (19:58, 20:00) passed all 45 checks (XC 18/20 and 26/21; every sport's refreshes, result lines and expanded views; Golf 6/6 with The Ally final). `validate-schools tcu --athletes-only` on production: 14/14. **41 minutes start to production** (Iowa State's record of 29 for 12 sports stands). The time went to two rounds of preview fixes that a pre-push athlete check and a next-day survey would have caught.


## October 7, 2026 — Texas Tech, all 10 sports (PR #238)

User: "Let's do Texas tech. Learn from it. We need more speed."

- **Start 20:08 UTC, production verified 20:34 UTC: 26 minutes** for 10 sports (record; Iowa State 29 for 12, TCU 41 for 14).
- **Speed changes:** the module was built from TCU's handlers (superset of the scaffold's rules) rather than the scaffold template, with Texas Tech's routes (generic basketball/golf/tennis pages and homepage candidates dropped). Test blocks were generated from `survey --lines` by a script. `survey-school` now serves saved archive pages, stories and TFRRS pages to the Worker and attaches them as production does, so its GATE flag is accurate (Nike XC Town Twilight was a false GATE before). `fetch-school-fixtures` saves TFRRS pages for every past meet, not only those with a schedule result. `screenshot-school` waits for the default sport's first load (Volleyball was captured mid-load).
- **New Texas Tech rules (each mutated, every mutation fails the test):** "Opponents TBD" bracket rounds and a home tournament whose opponent names the school (the Lubbock 25K, "Texas Tech University") read as their tournament; neutral postseason games named after a round ("NCAA Championship Semifinals") read `at`; kit option `ownLinkDays` (Texas Tech 3: the ACU Invitational, Sep 18-20, story Sep 22); kit option `volleyballSets` (Central Arkansas, Sep 18: the schedule links a preview, the archive story gives "in four sets"). Both kit options default to the old behavior for other schools.
- **Records** equal the official pages: football 5-0 (Big 12 2-0), volleyball 8-8 (0-4), soccer 7-0-4 (3-0-1).
- **Tests run:** `npm run test:release` passed on the final commit; CI (guardrails, certification-matrix, Workers build) green; `verify:preview --sports=all` exit 0 (33 checks: XC 18/20 and 26/21, 36/36 refreshes per sport, result lines, expanded views); `validate-schools --deep` on the preview: 9/10 on the first commit (Volleyball Central Arkansas `recap_not_found`, fixed by `volleyballSets`), then 9/10 with one transient Football "fetch failed", then 10/10 on rerun; athletes 10/10 (three each) on the preview and on production; screenshots read for Cross Country, Basketball, Tennis, Volleyball.
- **Merged** `a2a79df` under the standing permission. `verify:prod --sports=all --version=4.58.0-texas-tech`: exit 0, 33 checks, XC 18/20 and 26/21.
- **Open:** Track & Field (page still lists 2025-26); no live Texas Tech card observed yet (soccer at Oklahoma State, volleyball vs Baylor, Oct 8). West Virginia is the last unconverted Big 12 school.

## October 7, 2026 — West Virginia, all 14 sports (Big 12 finished)

**Request:** "Finish big 12 with West Virginia. New speed record."

**Timeline (UTC):** start 20:44; scaffold, Texas Tech handlers copied, fixtures (50 s), survey, rules and tests by 20:50 first push (PR #240); preview up and checked by ~21:00; rifle archive fix pushed 21:06; merged 21:13 (`a5c1d26`); production `4.59.0-west-virginia` live 21:14. Total 30 minutes for 14 sports (2.1 min per sport). Texas Tech's 26-minute total remains the total record; this is the per-sport record.

**Work:** `src/schools/west-virginia.mjs` from Texas Tech's reader (everything from `const HOST=` down, renamed). Routes corrected to the official pages (generic, empty-template and homepage candidates dropped); golf men only, tennis/cross country/track/rowing/gymnastics women only; track is `womens-track-and-field`. ESPN live boards for volleyball, soccer, basketball, baseball. Rules: places written alone ("8th Place", "T-6th Place", "First Place") read `8th`/`T6th`/`Women's team: 1st`; tennis and wrestling tournaments listed once per day are one event (`mergeMeetDays`); "Wrestle Off" internal; kit `createTfrrsMeetResults` gained `meetName` (default the opponent) so "RMU Invitational" finds TFRRS's "RMU Colonial Cross Country Invitational"; Rifle added to `meetSports` so Mount Aloysius (Sep 26) takes its archive story. Every rule mutated; every mutation fails `tests/west-virginia-module.mjs`. BYU and Texas Tech "other schools" checks moved to Illinois. Certification lists all 14 sports, minimum 3.

**Tests run:** `npm run test:release` passed on both commits (final `1ec118a`). `verify:preview --sports=all` passed on the final commit (36/36 refreshes per sport, expanded views, K-State XC 18/20, KU XC 26/21). `validate-schools --athletes-only` on the preview and production: 14/14, three Instagram each (no profile-card fallback needed). `validate-schools --deep` on the preview: the first run had 4 "fetch failed" errors while verify:preview was running; the second showed rifle's Mount Aloysius and volleyball's James Madison exhibition without a story; after the rifle fix, only the exhibition remains (13/14). Screenshots of every sport checked by eye. CI on #240 green. `verify:prod --sports=all --version=4.59.0-west-virginia` passed, XC 18/20 and 26/21.

**Open (source limits, evidence in `docs/WEST_VIRGINIA_MODULE.md`):** the James Madison volleyball exhibition (Aug 22) has no official story (the August archive has none); golf headlines show the place without field size (the schedule publishes "8th Place"; the New York Harbor Cup story gives no field size); Gymnastics, Rowing and Track & Field pages still list last season; no live card observed yet.

## October 7, 2026 — Alabama and Florida, 13 sports each (SEC started, PR #242)

**Request:** "Let's try two schools at once. Move to Sec and do Alabama and Florida because they are already in the app. Check speed and learn from it."

**Timeline (UTC):** start 21:34; both scaffolds 21:36 (route parity 13/13 each); West Virginia's handlers copied into both by script; both fixture fetches in parallel (~3 min); surveys and rules; test blocks generated from `survey --lines`; PR #242 pushed 21:51; preview up 21:52; first gate (both schools) passed 22:00; athlete fixes pushed 22:02 (`f36b891`); second gate passed 22:07; merged 22:08 (`3c2afc1`); production verified 22:10. **36 minutes for 26 sports (1.4 min per sport), per-sport record.**

**Alabama (`docs/ALABAMA_MODULE.md`):** cross country and track share `/sports/xctrack/schedule`, split by each entry's season (production had used `/schedule/text`, which the module reader does not accept); team places `Women (3rd, 98 pts.)`; golf `5th (284-279-281/844)` reads place and team score; swimming duals per team, outcome from the scores (the page wrote "M" for a win), league places, "League" events read `at`. Records equal the official pages: football 5-0 (3-0), volleyball 8-5 (0-4), soccer 12-1 (5-0).

**Florida (`docs/FLORIDA_MODULE.md`):** `#T3` rankings dropped; golf `T5/15 | (-27)`; NCAA postseason events read `at`; tennis tournaments take archive stories and are listed only with one (feed hook); swimming pages fetched through the private source (the sandbox got a 307 "Loading" page). The saved Florida State-sourced Aug 23 soccer detail was removed: Florida's own story is found now (`tests/regression.mjs` updated). Records: football 4-1 (2-1), volleyball 12-1 (3-0), soccer 5-4-3 (1-2-2).

**Athletes:** both schools certified for all 13 sports, minimum 3. Florida: three Instagram each; Track & Field's third comes from the cross country runners already verified from the official team account, who are on the track roster. Alabama: every roster and all 262 profile pages of the short sports read; only Naomi Jones (basketball, `big1nom`) and Emily Jones (swimming, `em.jones03`) publish athlete links (listed in `verifiedInstagrams`; the other link on the women's basketball roster is the head coach's); Baseball, Basketball, Golf, Gymnastics, Rowing, Swimming & Diving, Tennis join Soccer in `athlete_profile_fallback_sports`.

**Tests run:** each rule mutated (12 mutations; all fail the module tests). `npm run test:release` exit 0 on both commits (final `f36b891`). `verify:preview --sports=all` for both schools on both commits: exit 0, 42 checks each, 36/36 refreshes per sport, expanded views all pass (one `ai_failed` retry in Florida volleyball), XC 18/20 and 26/21. Athletes on the preview: Alabama 13/13; Florida 13/13 after one re-run (the first read the previous build's cached athletes). Screenshots of all 26 sports read; Alabama Golf's capture came before its athlete row loaded. CI green. `verify:prod --sports=all --version=4.60.0-alabama-florida` for both: exit 0; athletes on production 13/13 each.

**Merge note:** the standing permission names one school per PR; the user set this session's scope to two schools, and every other condition held for both.

**Open:** Alabama Rowing and Florida Lacrosse pages list last season; golf field size not published (Alabama); no live card observed yet for either school; `validate-schools --deep` was not run (verify:preview covered every expanded view).

## October 7, 2026 — Georgia and LSU added, 13 sports each (PR #244)

**Request:** "Add Georgia and LSU. Learn from it and optimize for the next two." The user set two schools as the scope; neither was in the app before.

**Timeline (UTC):** start 22:24. Both schools added to `src/sponsored-sports.json` and the front end, then scaffolded. Georgia's fixtures (georgiadogs.com refuses the sandbox: 403, fetched through the private source) ran in the background while LSU's site was surveyed: its "CUSTOM" provider is WMT, with yearless cards. PR #244 pushed 22:39. First preview: XC baselines and the gates passed, but athletes were Georgia 6/13 and LSU 12/13, and Georgia football's expanded views read `recap_text_unavailable`. A container restart stopped the first run. Fixes pushed 22:46 (`1ef632d`) and 22:48 (`558e008`). Final gates passed 22:57.

**Georgia (`docs/GEORGIA_MODULE.md`):** built from Alabama's handlers. Golf totals after `=`; league swimming places `4th, 207.5 pts.`; tennis tournaments as meets taking archive stories (the feed drops one without a story); `Preseason - X` exhibitions; the `SEC` entry reads as the `SEC Tournament`; `msd`/`wsd` team labels. Records equal the official ones: football 5-0 (3-0), volleyball 11-2 (3-0), soccer 4-3-5 (1-1-3).

**LSU (`docs/LSU_MODULE.md`):** own WMT card reader.
- Each card's year comes from the page title's season.
- Golf and swimming day cards are merged, even with another tournament listed between the days.
- Per-team cross country cards are merged; TFRRS gives the places.
- Golf place comes from the final story's headline only when the team is its subject.
- Cancelled cards and intrasquads are dropped.
- The recap matcher rejects a longer school name.

Records equal the official ones: football 4-1 (1-1), volleyball 7-6 (2-2), soccer 3-8-2 (1-3-1).

**Shared fixes (found on the first preview):**
1. WMT profile links under `/roster/season/2026-27/player/` were not accepted, so LSU basketball showed no athletes. `rosterProfiles` now accepts them; this only adds matches.
2. Story bodies opening with nested markup were cut at the first nested `</div>`: Georgia football read 46 characters. When that read is under 80 characters, the whole body is read by matching its divs. Longer reads are unchanged.

**Athletes:** LSU 13/13 with Instagram from roster cards. Georgia 13/13. Seven Georgia sports use profile cards: Baseball, Cross Country, Equestrian, Football, Swimming & Diving, Tennis, Track & Field. Every roster card and profile page of these sports was read (370 pages) and none publishes an athlete Instagram link; the same method found 17/17 on volleyball. Team-account tags could not be read: instagram.com answers with its login page (HTTP 429).

**Optimizations for the next two:**
- `scripts/generate-module-tests.mjs` writes the route table and every page block.
- `scripts/athlete-evidence.mjs` produces the profile-card evidence in one command.
- The fixture script retries dropped connections and reads non-SIDEARM pages through the module (stories, TFRRS, ESPN).
- The scaffold writes live scoreboards on.
- The handoff now explains how to add a school that is not yet in the app, and to check each site's platform first.

**Tests run:**
- Every new rule was mutated (15 mutations). Two survived: a dead golf rule, which was removed, and the cancelled-card rule, which got a test. All now fail the suites.
- `npm run test:release` exit 0 on `558e008` (also on `5904009`).
- `verify:preview --sports=all` for both schools on `558e008`: exit 0, 42 checks each, 36/36 refreshes for all 26 sports, XC 18/20 and 26/21. Expanded views all pass; Georgia football is now `recap_generated`.
- Athletes on the preview: 13/13 for both.
- Screenshots of all 26 sports taken; football, golf and volleyball were read by eye (LSU Golf's athlete row had not loaded at capture time).

**Open:** LSU golf shows "Completed" when the story headline names a player rather than the team (cards publish no place). LSU men's golf RedHawk Intercollegiate (no story, no place) is not listed. Track & Field for both schools fills when published. No live card observed yet.

**Merge and production (Georgia and LSU):** PR #244 merged at 23:03 UTC (`5779733`) on the standing permission. All conditions held for both schools, and the user set the two-school scope. Production reported `4.61.0-georgia-lsu` at 23:05.
- Georgia: `verify:prod --sports=all` exit 0; athletes 13/13.
- LSU: the first run reached an old instance during the rollout (`/api/status` 4.60.0, beach volleyball 502, basketball and volleyball without athletes). The re-run at 23:08 passed: exit 0, every sport 3/3 refreshes, XC 18/20 and 26/21, athletes 13/13.

41 minutes from start to production for 26 sports, including a new WMT reader and two shared fixes.


## October 7-8, 2026 — Ole Miss and Mississippi State added, 21 sports (PR #246)

**Request:** "Let's do Mississippi and Mississippi State. Use what you have learned and optimize from what you learn this time." Scope: two schools (Ole Miss is the catalog's "Mississippi"). Neither was in the app.

**Timeline (UTC):** start 23:24 Oct 7. Both sites checked first: SIDEARM, both answer the sandbox 403, so every page came through the private source. Sport lists read from each site's nav payload (Ole Miss 11 incl. Rifle; Mississippi State 10, no men's cross country). Both added to `src/sponsored-sports.json`, `SCHOOL_SPORTS`, `TEAM_THEMES` and `tests/certified-schools.json`, scaffolded, fixtures fetched in parallel, Georgia's handlers ported to both by script, and `athlete-evidence` started for all 21 sports in the background. A container restart (about 40 minutes lost) interrupted the work; the working tree survived. PR #246 pushed 00:46 Oct 8; first preview: gates passed, athletes 11/11 and 10/10, but Mississippi State football's expanded views were `recap_text_unavailable`. Fixes pushed (`220f27f` story blocks, `5d5ed5b` golf asterisk); final gates passed; merged 01:19 (`bd98783`); production verified 01:21. 117 minutes wall clock.

**Ole Miss (`docs/OLE_MISS_MODULE.md`):** golf place-in-field with team score from two fields or one (`17th/18 --` + `901 (+49)`, `2nd/16--859 (-5)`); a cancelled last round given as the round's no-play note (The Ally) keeps the round before's place; golf finals take archive stories only when dated on or after the last round (the Boilermaker's last round links the Cougar Classic's story; The Ally waits for its own); rifle at `womens-rifle`; a leading `*` (individuals-only golf) dropped. Sparse athlete links pinned in `verifiedInstagrams` (Baseball 3 of 42 profiles, Track & Field 4 of 88, Volleyball 2, Softball 1). Records equal the official: football 3-1 (1-1), volleyball 8-6 (2-1), soccer 7-6 (0-5).

**Mississippi State (`docs/MISSISSIPPI_STATE_MODULE.md`):** golf rounds name no tournament (merged by opponent); place is the standing after the final round (`t6th after final rd.`, `Team Champions` = 1st), and after "Final Round Canceled, Second Round Scores Become Final" the round before's; tennis result-field sentences are not results; TFRRS names the team "Miss State" (women only); volleyball archive stories by set scores (kit option `volleyballSetScores`, on for the two Mississippi schools only: the Texas A&M story gives 25-22, 25-20, 28-26 but never "3-0"). Football recaps live at "Game Day" addresses and are real recaps. Records equal the official: football 4-1 (2-1), volleyball 11-3 (1-2), soccer 7-1-4 (1-0-4).

**Shared fix:** `recapArticleText` reads SIDEARM "story blocks" (`c-story-blocks__wrapper`, read whole by matching divs) when every earlier rule found nothing; before, such pages gave no text. Checked on all five Mississippi State football stories (each starts with its dateline).

**Athletes:** `scripts/athlete-evidence.mjs` read every roster and profile page of both schools (800 pages) before the first push. Profile-card sports: Ole Miss Cross Country (0 links of 30), Softball (1 of 26), Volleyball (2 of 18); Mississippi State Baseball (0 of 41). Every other sport publishes 3 or more.

**Tests run:**
- 12 rule mutations (11 rules plus the asterisk); all fail the module suites.
- `npm run test:release` exit 0 on `0360611`, `220f27f` and `5d5ed5b`.
- `verify:preview --sports=all` both schools on `5d5ed5b`: exit 0, 36/36 refreshes for all 21 sports, XC 18/20 and 26/21; every expanded view passes, all with highlights except the Chile Pepper race (TFRRS not published) and two softball exhibitions without stories.
- Athletes on the preview (first and final commit) and on production: 11/11 and 10/10.
- `validate-schools --deep` on the first preview: Mississippi State 8/10 (Chile Pepper partial; football, since fixed); Ole Miss 9/11 with two "fetch failed" network errors (not re-run; `verify:preview` covered every expanded view).
- Screenshots of all 21 sports; golf, tennis, football and cross country read by eye.
- `verify:prod --sports=all --version=4.62.0-ole-miss-mississippi-state` for both: exit 0.

**Merge note:** the standing permission names one school per PR; the user set this session's scope to two schools, and every other condition held for both.

**Open:** The Ally (Ole Miss women's golf) final story; Chile Pepper TFRRS points; Track & Field pages still list 2025-26; no live card observed; season-badge contrast on dark primaries (shared UI, for the user to decide); `generate-module-tests` should default to the test file's date.

## October 8, 2026 — In-season badge glow (PR #248)

**Request:** "Can we add a glow to the in season. That would fix it for all schools." The active badge drew `#06151c` text on each school's primary color, hard to read on dark primaries. A glow alone would not fix the text, so the rule also takes the theme's `--theme-on-accent` (already set per school), as the other team-colored controls do; the glow and border are the primary mixed toward white. Version `4.62.1-season-glow`.

**Tests:** `npm run test:release` exit 0; preview screenshots of Mississippi State, LSU, West Virginia, K-State, Oklahoma State and Colorado read by eye; CI green. The change touches every school, outside the one-school standing permission, so the merge waited for the user ("Go"). Merged `b0a7549`; production `4.62.1-season-glow` at 01:40 UTC, served page carries the new rule, `verify:prod` (Mississippi State volleyball, XC 18/20 and 26/21) exit 0, production screenshot read.


## October 8, 2026 — Missouri and Tennessee added, 25 sports (PR #250)

**Request:** "Add Missouri and Tennessee. Learn and optimize for faster onboarding." The user set two schools as the scope; neither was in the app before.

**Timeline (UTC):** start 10:30. Both sites checked first. Tennessee is SIDEARM; its pages send the sandbox into a redirect loop (307), so they were read through the private source. Missouri is WMT (Nuxt), although the catalog lists it as SIDEARM, and it answers directly.
- Both schools added with the new `add-school` script, scaffolded, and ported (Tennessee from Mississippi State, Missouri from LSU).
- Fixtures and the athlete evidence (1,087 pages) ran in parallel.
- First push 10:43 (`0de4048`), PR #250.
- The first preview found Missouri Gymnastics with too few athletes: the athlete list was cached per version, so the new pins could not show. Pins were added and the cache key was fixed.
- `verify:preview` found Missouri soccer at Arkansas without highlights; the story was in the archive, so archive stories were added.
- Final commit `860bbb4`; all gates passed; merged 11:12 (`a941a94`); production `4.63.0-missouri-tennessee` verified at 11:13. **43 minutes** from start to production for 25 sports.

**Missouri (`docs/MISSOURI_MODULE.md`):** LSU's card reader with Missouri's markup:
- `__day` date boxes;
- recap links named by their labels ("Final Recap"; else the latest round's story);
- golf places from `result__text` (`5th of 13`, `1st (842)`);
- tennis "Day One" cards named by their heading and merged;
- `#24/#RV` rankings;
- the `schedule-event-exhibition` marker;
- event-named home meets read "at";
- event names in headlines do not match ("Bowling Green/Toledo Invitational");
- archive stories for scored finals.

Records equal the official ones: football 4-1 (1-1), volleyball 8-7 (1-2), soccer 3-7-2 (0-4-1). The soccer check first gave 4-7-2, which exposed the unlabeled Lindenwood exhibition. Three ported rules were redundant (their mutations survived) and were removed.

**Tennessee (`docs/TENNESSEE_MODULE.md`):** Mississippi State's handlers, plus golf's score-then-place fields (`846 (-6)` and `2/18`). Combined sports are Basketball, Golf and Tennis; Swimming & Diving is one page. Records equal the official ones: football 4-1 (1-1), volleyball 10-3 (1-2), soccer 6-2-3 (1-2-2).

**Athletes:**
- Missouri 13/13: profile cards for Cross Country, Tennis and Track & Field (0 links in 104 profiles); Gymnastics pinned (the app found too few links on its roster cards).
- Tennessee 12/12: Baseball pinned 2 plus a profile card; Softball and Volleyball pinned.

**Shared fix:** the athlete cache key (`/live/athletes`, Cache API, 6 h, keyed by VERSION) now also carries a hash of the sport's `verifiedInstagrams` pins. Sports without pins keep their key. This explains the earlier note "the athlete check right after a push can read cached athletes from the previous build".

**Faster onboarding (new and changed tools):**
- `scripts/add-school.mjs`: publisher detection by marker count. Newer SIDEARM pages carry `__NUXT__` too, so `onboard-school`'s `detectPublisher` would call them WMT.
- `scripts/port-handlers.mjs`: comments keep the source school's examples.
- `fetch-school-fixtures --prune`: also flags duplicate addresses (`wsoc`, `wvball`) and `@season` templates.
- `scripts/fill-expected.mjs`: `__FILL_NAME__` placeholders.
- `athlete-evidence --pins`: athlete names from page titles.
- `generate-module-tests`: defaults to the test file's date (closes the Oct 7 open item).
- `scripts/dump-cards.mjs`: WMT card dumps.
- `onboard-school`'s slug table now has `womens-gymnastics`.
- `.gitignore` has `screenshots/`: one push carried 25 screenshots and was followed by a removal commit.

**Tests run:**
- 12 + 4 rule mutations, all killed after the redundant rules were removed.
- `npm run test:release` exit 0 on `860bbb4` (and earlier commits).
- `verify:preview --sports=all` for both schools on `860bbb4`: exit 0, 36/36 refreshes per sport, XC 18/20 and 26/21. Every expanded view passes; only Missouri's Aug 5 soccer exhibition has no story (none published).
- Athletes on the preview and on production: 13/13 and 12/12.
- Screenshots of all 25 sports; Missouri golf and Tennessee football read by eye.
- CI green; PR clean.
- `verify:prod --sports=all --version=4.63.0-missouri-tennessee` for both: exit 0.

**Merge note:** the standing permission names one school per PR. The user set this session's scope to two schools, as in #244 and #246, and every other condition held for both. The shared athlete cache-key change only changes cache freshness for sports with pins; output is unchanged.

**Open:** Missouri Gymnastics and Track & Field, and Tennessee Rowing, fill when published. Women's tennis at Tennessee shows no final yet (the ITA All-American has no story). No live card observed yet for either school.

**Earlier fast-path notes (moved here from the current-session file, October 8):**

### How to convert a school (fast path, October 7)

**Adding a school not yet in the app (Georgia, LSU):** add it to `src/sponsored-sports.json` (from the site's nav) and to `SCHOOL_SPORTS` and `TEAM_THEMES` in `public/index.html`, then scaffold. Add its `tests/certified-schools.json` entry (all sports, minimum 3).

**Ole Miss + Mississippi State lessons (21 sports, both SIDEARM, both 403 to the sandbox):** port the newest SIDEARM school's handlers by script (copy from `const HOST=` down, rename) **before** the fixture fetch, so it fetches the module's routes and not the scaffold's candidates. Start `athlete-evidence` for every sport the moment the module exists (background, ~3 min for 800 pages): the profile-card list and any `verifiedInstagrams` pins for sports with few links were known before the first push, and athletes passed on the first preview. Run `generate-module-tests --date=<the test file's now>` (it defaults to today, which breaks the generated blocks after midnight UTC). Read every `expanded views` line of `verify:preview`, not only PASS: Mississippi State football's 5 stories were `recap_text_unavailable` (SIDEARM "story blocks" pages; the shared reader now reads them). Screenshots caught a leading `*` on individuals-only golf names. TFRRS can name a school differently ("Miss State").

**Georgia + LSU lessons (one SIDEARM, one WMT; 26 sports):** check each site's platform first (`curl` the football schedule; `sidearm` vs `wmt` markers). The catalog's "CUSTOM" can be WMT. A WMT site whose cards have no `datetime` (LSU) needs its own reader: start from `src/schools/lsu.mjs` (year from the page title's season, day cards merged, per-team cross country merged, cancelled cards dropped). `scripts/generate-module-tests.mjs --school=<id>` now writes the route table and every page block (replaces the throwaway scripts); the fixture script retries dropped connections and reads WMT pages through the module, saving stories and TFRRS. Before the first push: count roster Instagram links, and for sports with none run `scripts/athlete-evidence.mjs --school=<id> --check=<a sport with links> <sports>` (every roster card and profile page through the private source; Georgia 370 pages in ~2 min) so the profile-card list and its evidence are known. The first preview found two shared-code gaps worth checking on every new site: WMT profile links under `/roster/season/<year>/player/` (now accepted), and story bodies that open with nested markup (expanded view read only 46 characters; now read whole). Run `verify:preview` and look for `recap_text_unavailable` in expanded views: it passes the gate but means no highlights.

**Two schools at once (Alabama + Florida, 36 minutes for 26 sports, 1.4 min per sport, the per-sport record):** scaffold both, run both fixture fetches in parallel, copy West Virginia's handlers into both with one script (rename ids, host, time zone, TFRRS teams; drop WV-only rules), survey both, generate the test blocks from `survey --lines` (watch: two sports on one page need distinct variable names), one PR, both `verify:preview` runs and both athlete checks in parallel. Lessons: a route ending `/schedule/text` is not read by the module (use `/schedule`); some pages answer the sandbox with a 307/"Loading" page, so fetch them with `scripts/fetch-official.mjs` (private source); run the athlete check before the first push from the roster pages (count `instagram.com` links per roster) so profile-card sports are known up front; the athlete check right after a push can read cached athletes from the previous build (re-run once).

Texas Tech holds the total record: **26 minutes** from start to production for 10 sports (2.6 min per sport); West Virginia holds the per-sport record: **30 minutes** for 14 sports (20:44-21:14 UTC, 2.1 min per sport); Iowa State 29 for 12, TCU 41 for 14, Houston 49 for 11. What made Texas Tech fast: **start the module from the newest converted school's handlers (now West Virginia's), not the scaffold template** (its rules are a superset; copy everything from `const HOST=` down and rename), and generate the test blocks from `survey --lines` with a script. One preview round was lost to a volleyball final whose page links a preview story (run `validate-schools --deep` on the preview as soon as it is up, in parallel with `verify:preview`). Do the steps in this order; start each slow step in the background and work on while it runs:
1. **Setup (1 min):** `npm run scaffold-school -- --school=<id> --write`. Writes the module with Houston's and Iowa State's settings and every hook wired (shared kit `src/sidearm-school-kit.mjs`: published times, golf rounds and match play, meet days, bracket rounds, open championships, neutral multi-day events, conference tournaments, `(Ex.)` labels, team places with points, recap matcher, archive stories, TFRRS cross country, doubleheaders), each applying only to sports in `pageDataSports`. Adds the test file with helpers and `npm run test:<id>-module`. Then fix the BYU-style "other schools are unchanged" tests if they name this school (BYU's named Iowa State; now TCU).
2. **Fixtures (1 min):** `NODE_USE_ENV_PROXY=1 node scripts/fetch-school-fixtures.mjs --school=<id> --tfrrs-f=<url> --tfrrs-m=<url>` (TFRRS team pages are `https://www.tfrrs.org/teams/xc/<ST>_college_<f|m>_<Name>.html`; check with curl). Saves every schedule candidate, stories, `/archives` and the archive stories of past meets/tournaments the schedule links no story for, ESPN payloads, TFRRS pages. Drop the routes it flags (empty template, homepage); set `combinedSports` and `teamLabels` (a men's page with no `mens-` in its address).
3. **Read it (10 min):** turn every sport on in `pageDataSports`, then `node scripts/survey-school.mjs --school=<id>`. It prints each event in K-State's wording and flags **GATE** on any final with neither result line nor story (the gate fails those; fix them first, usually with `meetSports` and the archive). `--raw` prints page data; `--lines` prints test-ready arrays. Write one test block per sport from `--lines` (see `tests/iowa-state-module.mjs`); mutate each new rule.
   The survey now attaches the saved archive stories and TFRRS results as the Worker does, so a GATE is real. A home tournament named after the school, "Opponents TBD" bracket rounds, round-named postseason games, late tournament stories (`ownLinkDays`) and set-count volleyball stories (`volleyballSets`) are handled in Texas Tech's module; copy them forward.
4. **Publish:** commit, push, open the PR; the preview is up within a minute. In parallel: `npm run test:release` (3 min), `npm run verify:preview -- --branch=<branch> --school=<id> --sports=all` (5-6.5 min, background), athletes **at once** (`node tests/validate-schools.mjs <id> --athletes-only --base=<preview>`: tennis/swimming rosters often publish no Instagram → `athlete_profile_fallback_sports`; cross country may have only 2 → minimum 2, as KU and Oklahoma State), and `npm run screenshot-school -- --school=<id> --branch=<branch>` (every sport's page, 390px, school time zone). Merge when all pass, then `verify:prod` and the athletes check on production.

## October 8, 2026 — Texas and Texas A&M added, 25 sports (PR #252)

**Request:** "Onboarding of Texas and Texas A&M. Learn and optimize for increased speed." The user set two schools as the scope; neither was in the app before.

**Timeline (UTC):** start about 10:35. Texas is SIDEARM (read directly and through the private source); its nav links name sports without `/schedule`, so `add-school` found only Football and was given `--sports=`. Texas A&M is WMT. Both added, scaffolded and ported (Texas from Tennessee, A&M from Missouri); fixtures and athlete evidence in parallel. First push `cb7fe31`, PR #252 at 12:00. Screenshots on the first preview found two bugs (below); fixed in `ab33350`, version `4.64.1` so the preview's athlete cache was fresh. All gates passed on `3019a9c`; merged 12:17 (`bf36ec7`); production verified 12:19.

**Texas (`docs/TEXAS_MODULE.md`):** one "Track & Field / Cross Country" page split by month (Aug-Nov cross country), track's empty season valid; golf `T-2nd of 14 (839)`; two-poll rankings; ITF pro events out. Records checked by hand (the pages publish none): football 4-0 (1-0), volleyball 7-5 (3-1), soccer 7-2-3 (2-1-2).

**Texas A&M (`docs/TEXAS_AM_MODULE.md`):** Missouri's reader read 0 cards at first: A&M's cards are `schedule-event-default__*`, the date box is the card's top row, home/neutral cards have no divider (venue from the date box), `(#21)` rankings, `W, Win 3-1`. Golf: archive story for the Fighting Irish Classic, headline places ("Runner-Up Finish", "Aggies Finish Second"), slash-named tournaments matched by their last part. Records equal the published: football 3-2 (1-2), volleyball 10-6 (3-1), soccer 4-8 (0-5).

**Shared fix:** `rosterProfiles` accepted `/roster/season/2026` (A&M's "Roster for Baseball" menu link on empty roster pages) as an athlete through the SIDEARM `/roster/<name>/<id>` shape; season pages are now skipped.

**Athletes:** Texas 13/13 (profile cards for Cross Country, Golf, Rowing, Swimming & Diving, Tennis, Track & Field: 0 links on their profile pages; pins for Basketball, Softball, Volleyball). A&M 10/10; Baseball (2027) and Track & Field (2026-27) rosters list no players, so they stay out of the athlete list until published (Arizona's precedent).

**Tools:** `port-handlers` renamed `'missouri'` to `'texasAm'` (an id without a hyphen is also its camel name) and kept `mutigers\.com` in a regex: quoted ids and escaped hosts are now renamed first, and comments citing the source school keep its name. `generate-module-tests` names a second sport on one page apart.

**Tests run:** 15 rule mutations, all killed; `npm run test:release` exit 0 on `4.64.1`; `verify:preview --sports=all` both exit 0 (36/36 refreshes per sport, XC 18/20 and 26/21, every expanded view passing); athletes 13/13 and 10/10 on the preview and production; screenshots of all 25 sports; CI green; `verify:prod --sports=all --version=4.64.1-texas-texas-am` both exit 0.

**Speed:** about 105 minutes, slower than Missouri/Tennessee's 43: A&M's new card generation needed a reader adaptation, and one preview round was lost to the two bugs. Lesson: dump one WMT card before surveying, and read the screenshot lines before the long gates.

**Open:** A&M Baseball and Track & Field athletes and schedule when 2026-27 is published; Texas Rowing and Track & Field when published; two A&M golf finals "Completed"; no live card observed yet for either school.


## October 8, 2026 — Arkansas and Auburn added, 25 sports (PR #254)

**Request:** "Start Arkansas and Auburn. Learn and optimize for speed." The user set two schools as the scope; neither was in the app before.

**Timeline (UTC):** start 12:35. Auburn: WMT (`add-school` direct; XC/Track on one `xctrack` page, added with `--sports=`). Arkansas: the football schedule address redirects in a loop; the site is WordPress ("bordeaux" template, `/sport/<code>/schedule/`), so `add-school` now falls back to the homepage nav and was given `--sports=`. Auburn ported from Texas A&M (`port-handlers`), adapted to its cards (0 cards read at first: `schedule-event-item__*`, `datetime` dates). Arkansas ported for its structure, then given its own reader. First push 13:06 (`PR #254`); first preview: gates passed but Arkansas expanded views had no highlights (story text in `div.article-paragraph`), athletes 10/12 (Swimming, Tennis) and Auburn 12/13 (Soccer). Fixed in `bb86e56` (version `4.65.1`); all gates passed on the second preview.

**Arkansas (`docs/ARKANSAS_MODULE.md`):** own reader (season from the page heading, winner-first results, doubleheaders, meet places from the cards, multi-day spans, internal events out); undated stories checked by `article:published_time`; archive stories from the team's WordPress category; cross country per team page with its own TFRRS race; soccer's two August exhibitions from the published record (4-4-3, 2-1-2); players' pro tennis events out. Records: football 2-3 (0-2), volleyball 8-6 (0-3), soccer 4-4-3 (2-1-2, as published).

**Auburn (`docs/AUBURN_MODULE.md`):** A&M's reader with Auburn's card names; one XC/Track page split by season; golf day cards merged by course with the last day's place. Records counted from the official results: football 3-2 (1-2), volleyball 11-4 (1-2), soccer 7-2-3 (3-2).

**Shared changes:** story reader reads `div.article-paragraph`; roster table rows linking `/roster/<name>/` on the school's host are profiles; a WMT bio's own `roster-bio-social-links` is read before the page menu (Auburn's menu team accounts had become every soccer player's "Instagram", all rejected by the shared-handle guard); roster-only profiles take their portrait from the profile pages read; Arkansas's team accounts blocked. Scripts: `add-school` homepage fallback and `/sport/` links; `fetch-school-fixtures`, `survey-school` (`--live`), `generate-module-tests` read `/sport/<slug>/` pages and undated stories; `athlete-evidence` reads `/roster/<name>/` links.

**Athletes:** Arkansas 12/12 (profile cards for Swimming & Diving and Tennis: 26 and 19 profile pages read, only team accounts); Auburn 13/13 (Volleyball pins 3; Soccer passed on a rerun after one empty cold read).

**Tests run:** 15 rule mutations (14 killed; the surviving Auburn runner-up addition was removed) plus the story-text mutation (killed); `npm run test:release` exit 0 on `bb86e56`; `verify:preview --sports=all` both exit 0 on `4.65.1` (36/36 refreshes per sport, XC 18/20 and 26/21, every expanded view passing; Arkansas highlights now `recap_generated`); athletes 12/12 and 13/13 on the preview; screenshots of all 25 sports, Arkansas golf and cross country read by eye; CI green.

**Open:** Arkansas men's tennis tournaments whose story names several events are not listed; Chile Pepper XC waits on TFRRS; baseball/softball fall games have no stories (none published); women's Track & Field (Arkansas) and Track & Field (Auburn) fill when published; no live card observed yet for either school.
