# Oklahoma State school module

`src/schools/oklahoma-state.mjs` owns Oklahoma State's okstate.com routes, program combinations, the split of the shared cross-country/track schedule, and the two existing verified athlete identities. The Worker imports its configuration and creates its handler with no shared-parser changes. The event/result contract, caching, display and generic SIDEARM parsing remain shared.

## Ownership inventory

| Behavior | Owner |
| --- | --- |
| Explicit schedule routes for all 11 sponsored sports | `oklahomaStateSchool.scheduleUrls` (previously six inline `KNOWN_URLS` entries plus generic fallbacks) |
| Explicit roster routes for all 11 sports | `oklahomaStateSchool.rosterUrls` (previously two inline `KNOWN_ROSTER_URLS` entries plus generic fallbacks) |
| Men's and women's programs loaded and labeled for Basketball, Golf and Tennis | `oklahomaStateSchool.combinedSports` |
| Two cross-country Instagram identities verified by official team-account tags | `oklahomaStateSchool.verifiedInstagrams` |
| Game data embedded in okstate.com schedule pages (`__NUXT_DATA__`): W/L results, recaps, golf placings, start times, per verified sport | `oklahomaStateScheduleGames` and `enrichScheduleEvents`, called from `parseHtml` |
| Empty Track & Field schedule on the shared page returned as 200 `[]` | `isEmptyProgramSchedule`, read by `fetchUrl`/`fetchLive`/`freshGroupedFeed` only for `oklahoma-state` |
| Shared `/sports/mxct/` schedule split between Cross Country and Track & Field | `createOklahomaStateHandlers().filterEvents`, called from `parseHtml` only for `oklahoma-state` |
| Cross Country results from each meet's official results document (feed and expanded view) | `parseOklahomaStateMeetResults` and `attachMeetResults`, called from the shared `attachOfficialMeetResults` / `attachOfficialHighlights` hooks |
| Generic SIDEARM parsing, roster/profile parsing, social identity guards, official-profile fallback, feed orchestration, cache, UI | Shared Worker (unchanged) |

## Fixes

- **Track & Field no longer shows cross-country meets.** Both sports read the same official `mxct` schedule. A meet named "Cross Country"/"XC" is cross country; a name with indoor/outdoor/relays/track/field/multi-event words is track; otherwise August–November is cross country and December–July is track. Only the okstate.com shared program pages are split. On September 29 all six published meets were cross country, so Track & Field is correctly empty until indoor meets are published.
- **Tennis: both divisions loaded; the feed stays empty because of the source.** Production diagnostic showed the women's page parsing 21 events and the men's page 4. Tennis was not a combined sport for Oklahoma State, so only the women's page was used. Both divisions are now loaded and labeled. The official women's page, retrieved September 29, is still the "2025-26 Cowgirl Tennis Schedule" (21 matches, January 23–April 12, 2026). The preview feed shows the men's 4 events are also outside the 2026–27 season. Tennis is therefore correctly empty until okstate.com publishes the 2026–27 schedule; this is a source gap, not a parser defect.
- **Men's Golf was missing.** Only the women's schedule was loaded. Both golf schedules and rosters are now loaded and labeled.
- **Athlete certification (Tennis, Equestrian, Track & Field).** The app was already returning the official-profile fallback (official okstate.com roster profile, portrait, no Instagram) for rosters that publish no personal links. `tests/validate-schools.mjs` rejected every athlete without Instagram. Oklahoma State's certification entry now lists these three sports in `athlete_profile_fallback_sports`. For those sports only, an athlete may have no Instagram if its profile is an https okstate.com roster URL; any Instagram that is present must still be an Instagram destination. Other schools keep the stricter rule unchanged. `athlete_minimums` now protects Equestrian and Track & Field too. No Instagram accounts were added, inferred or copied between sports.

## Validation

`npm run test:oklahoma-state-module` (also in `npm test` and `npm run test:release`) checks:

- All 11 sponsored sports route to okstate.com through the module; no `oklahoma-state|` configuration remains in `src/index.js`; other schools keep the shared combination policy.
- The six real `mxct` meets (names/dates from the official schedule as served by production on 2026-09-29) all stay in Cross Country and none appear in Track & Field. Track-named and winter/spring meets classify as Track & Field. Other schools, other pages and non-official hosts are not filtered.
- Tennis and Golf orchestration through `fetchLive` loads and labels both divisions (minimal synthetic pages). The real official women's Tennis page (retrieved 2026-09-29, gzipped fixture) parses all 21 published 2025-26 matches and presents none of them as the current season.
- The real official `mxct` and wrestling roster pages (retrieved 2026-09-29, stored gzipped and unmodified) produce the two verified cross-country identities, three profile-only Track & Field athletes that satisfy the fallback rule, and three wrestlers with athlete-bound roster Instagram links and no extra biography fetches.

A before/after route dump across all 219 catalog school/sport combinations changed only three Oklahoma State entries: Golf and Tennis (combined, unused fallbacks removed) and Soccer (unused fallback rosters removed; `womens-soccer` remains first). The verified-identity map is unchanged.

## Known source gaps

- okstate.com's bot protection (Incapsula) returns HTTP 403 to the development sandbox intermittently. On September 30 these schedules downloaded and are now fixtures: Football, Soccer, Softball, Baseball, men's and women's Golf, men's Basketball, Wrestling and Equestrian. The women's Tennis page downloaded too and is unchanged. The men's Tennis and women's Basketball pages stayed blocked. The production and preview Workers were not blocked.
- The women's program roster is not loaded. The `mxct` roster is 55 men and is already more than the athlete scan budget, so adding the women's roster has no effect without a roster-combination change. (The women's schedule question is settled under Cross Country results below.)
- okstate.com's bot protection returned 403 for both Cross Country recaps from the sandbox, so recap pages in tests are synthetic wrappers. The deployed Worker fetched and verified both recaps.
- No deep (recap/highlight) certification has been run for Oklahoma State.

## Preview verification (PR #21, commit `1a55077`)

Branch preview `https://oklahoma-state-module-sas-sports.lovetogivepain.workers.dev` returned `4.29.0-oklahoma-state-module`. Forced feeds:

- **Golf:** both `Men's` and `Women's`, 5 results and 24 upcoming.
- **Cross Country:** the same 6 meets.
- **Track & Field:** no cross-country meets. The standard "no usable events" response is returned because no track meets are published.
- **Tennis:** empty, for the source reason above.

`node tests/validate-schools.mjs --schools=oklahoma-state --base=<preview>` passed 11/11. On the preview, K-State XC kept 18/20 rows and KU XC kept 26/21.

## Cross Country results (PR #23, `4.29.1-oklahoma-state-xc-results`)

Oklahoma State Cross Country now follows K-State's results contract:

- One group per collegiate race, labeled by division and distance.
- `Oklahoma State team` row first, then every placed athlete as `place · time`.
- Women before men.
- Headline `Women's team: … / Men's team: …`.
- `recap_result_count`, `meet_results_verified`, `highlights_verified` and four row-derived highlights, built as K-State builds them.

Rows come from the meet's official results PDF, which is linked from the schedule card. The parser handles both formats okstate.com published this season:

- **DirectAthletics MeetPro** (Cowboy Jamboree): the race title is printed in each page footer, and the team column is truncated to `Oklahoma Stat`.
- **Bib-number format** (Cowboy Preview): headers such as `Mens 5,000 meters`.

Parsing rules:

- High-school races and other teams, including Oklahoma and Oklahoma Christian, are excluded.
- Scratched entrants and entrants listed without a place or time get no row.
- The document must carry the meet's date.
- The document must be on okstate.com `/documents/` or SIDEARM's okstate S3 path.
- The card's recap link is kept only if `recapMatchesEvent` accepts it; otherwise it is removed.
- `source` names the results document.

A missing, wrong-date or unofficial document is marked `official_results_partial`. The schedule row stays, and no rows are invented.

The feed (`fetchLive`) and the expanded view (`attachOfficialHighlights`) call the same handler. The expanded view no longer uses recap prose or AI rows. Those previously produced mislabeled rows: two men filed under `Women's`, "Senior Laban", and the women's score shown as the men's team result.

| Meet | Women | Men | Headline |
| --- | --- | --- | --- |
| Cowboy Preview (Sept 5) | `Women's 3K`: team 1st · 26 pts + 14 athletes | `Men's 5K`: team 1st · 31 pts + 15 athletes | `Women's team: 1st · 26 pts / Men's team: 1st · 31 pts` |
| Cowboy Jamboree (Sept 26) | `Women's 6K`: team 2nd · 64 pts + 15 athletes | `Men's 8K`: team 2nd · 44 pts + 20 athletes | `Women's team: 2nd · 64 pts / Men's team: 2nd · 44 pts` |

Jamboree also lists Kailey Stockton as `--` with no place or time; she gets no row.

**Women's schedule decision.** The women's program schedule is not needed for results:

- Each meet's results document linked from `mxct` contains both collegiate races, and the `mxct` recap covers both teams.
- On the preview Worker, `/api/diagnostic` returned HTTP 200 for `/sports/womens-cross-country-track/schedule` with the same 6 events as `mxct` (587 KB vs 589 KB page). The diagnostic reports counts, not meet names.
- The women's page is therefore only a fallback candidate after `mxct`. `fetchLive` stops at the first usable source, so it is not fetched normally.

Tests: `tests/oklahoma-state-cross-country.mjs` (`npm run test:oklahoma-state-xc`, also part of `npm test` and `npm run test:release`).

- It uses the unmodified official PDFs (`cowboy-preview-2026-results.pdf` and `cowboy-jamboree-2026-results.pdf`), downloaded 2026-09-29 through the links on okstate.com's document pages.
- It also uses their `unpdf` text (`*.txt.gz`). CI runs without installed packages, so the Worker's `extractText` is stubbed by exact PDF bytes. When `unpdf` is installed, the test re-extracts both PDFs and requires the result to equal the committed text.
- It checks rows, group order, headline and fields; feed/expanded parity (complete and missing-document cases); idempotence; wrong-date, unofficial and non-matching-recap sources; and school/sport/status isolation.
- Mutation checks showed the group-order and missing-document parity assertions fail without the module hooks.
- `tests/regression.mjs` now requires `mxct` as the first XC schedule candidate.

**Production (September 29, 19:00 UTC).** PR #23 was merged as `0629321`. Production reports `4.29.2-feed-retry` (PR #24, merged afterwards, did not change `src/`). Forced feeds returned Preview 31 rows and Jamboree 37 rows, with the headlines above, and `/live/highlights` was identical to the feed for both meets. K-State XC 18/20 and KU XC 26/21 were unchanged.

## All sports vs K-State (September 30, `4.29.12-oklahoma-state-equestrian-times`)

okstate.com schedule pages embed each game as structured Nuxt data. It includes the published W/L, both scores, the recap and box-score links, golf placing text, and the local start time. The rendered cards omit most of this.

`oklahomaStateScheduleGames` decodes that data and keeps each game once; a "next game" widget can repeat a game. `enrichScheduleEvents` applies it per sport, and only for sports verified against an official page:

- `PAYLOAD_RESULT_SPORTS` (W/L headline `W, 41-24`, one `Result` row, exact okstate.com `/news/` recap): Football.
- `PAYLOAD_PLACING_SPORTS` (`7th of 16`): Golf. The schedule publishes no team score, so none is added.
- `PAYLOAD_TIME_SPORTS` (`Oct 2, 7:00 PM`): Football, Soccer, Softball, Baseball, Basketball, Wrestling, Equestrian.
  - A time is used only when the published time text is a real time that agrees with the page's date field.
  - TBA/TBD games stay date-only.
  - Times are the school's local wall clock, the same convention the shared code uses for K-State.

Games are matched by date and opponent. Anything ambiguous or unmatched is left unchanged.

| Sport | PR (merge) | Result in production |
| --- | --- | --- |
| Cross Country | #23 (`0629321`) | K-State race groups (September 29) |
| Football | #27 (`061390f`), #30 (`9e9ce79`) | 4 finals `W, 41-24` / `W, 59-0` / `W, 39-31` / `L, 10-24`, each with its recap; the expanded view gives 4 verified highlights; UCF `Oct 10, 11:00 AM` |
| Golf | #28 (`212154d`) | `7th of 16`, `6th of 16`, `5th of 15`, `1st of 12`, `9th of 12`; 24 upcoming; the expanded view gives 4 verified highlights |
| Track & Field | #29 (`4e618b1`) | 200 `[]` (only cross-country meets published), as K-State's track feed; was 502 |
| Soccer | #31 (`2ea1a7d`) | 12 results unchanged; 8 of 13 upcoming timed |
| Softball | #32 (`83eae71`) | 1 result unchanged; 4 of 7 upcoming timed |
| Baseball | #33 (`23fef47`) | 16 of 60 games timed |
| Basketball | #34 (`83a55b6`) | Men's: 5 upcoming timed; 3 July tour results unchanged. Women's: 0 timed on the preview; the page could not be downloaded here, so whether its games have times is unverified |
| Wrestling | #35 (`4a1910f`) | 9 of 17 timed; "All Day", TBA and blank times date-only |
| Equestrian | #36 (`3eb79bd`) | TCU and Baylor timed (`12:00 PM`); 12 upcoming |
| Tennis | none | Empty, as K-State would be with the same source. The men's page is the 2026-27 schedule (checked September 30), with 4 fall individual tournaments that all ended by Sep 27. Past tournaments without a team result are not listed, for K-State too (K-State's 16 parsed events → 8 upcoming, 0 results). The women's page is still 2025–26. The earlier "men's events outside 2026–27" note was wrong |

Checked and unchanged:
- The Soccer, Softball and Basketball feeds and expanded views already matched K-State: a `W, 3-1` headline, the exact official recap, and 4 verified highlights.
- The three July men's basketball tour exhibitions and the August 6 soccer exhibition are published, with recaps, on the official schedules.

Every PR ran `npm run test:release` and `npm test`, including without installed packages, plus a mutation check (switching the sport off fails the new assertions). Each PR's CI was green with no merge conflict before merging. On its branch preview, the sport matched and K-State XC 18/20 and KU XC 26/21 were unchanged. After each merge, production was checked for the version, the sport, and K-State/KU XC.
