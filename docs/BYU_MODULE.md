# BYU school module

`src/schools/byu.mjs` owns BYU's byucougars.com schedule and roster routes, its program combinations, its verified Instagram tags and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

BYU was chosen as the next Big 12 school on October 1, 2026 (user: "Let's add the next big 12 school"). It is the first unconverted Big 12 school in catalog order whose official site the development sandbox can download. arizonawildcats.com and baylorbears.com still returned HTTP 403; byucougars.com returned 200.

## Status (production `4.37.1-byu-track-field`, October 1, ~23:10 UTC)

All 12 sponsored sports read byucougars.com's official cards through the module (`cardSports`). Every route is an official sport page. All forced production feeds returned 200.

| Sport | PR | Production |
| --- | --- | --- |
| Football | #94 | 3 finals `W, 63-7`-style with recaps; 9 upcoming |
| Volleyball | #97 | 11 finals with recaps; 17 upcoming |
| Soccer | #98 | 11 finals (10 recaps; the official Sep 3 card links another game's recap); 9 upcoming |
| Cross Country | #99 | Both teams; 4 meets with `Women's team: 1st · 19 pts` and race rows from the recaps |
| Basketball | #100 | Men's 34 + women's 33, labeled |
| Baseball | #101 | 4 fall games |
| Softball | #102 | 7 fall games |
| Golf | #103 | Both teams; `4th`, `3rd`, `9th`, `1st`, each from the final recap; 23 upcoming |
| Tennis | #104 | Both teams; 5 completed tournaments (named by their headings); 10 upcoming |
| Swimming & Diving | #105 | Men's 9 + women's 10 meets |
| Gymnastics | #106 | Empty schedule (the page shows only 2025-26) |
| Track & Field | #107 | Was 502; empty schedule (both pages show only 2025-26) |

**Limitations:**
- Golf placings lack the field size and score, which the cards do not publish.
- Cross Country rows come from the recap tables: the top 10 overall, or BYU's scorers, so not every runner appears. The Utah Valley men's table has no place column, so it shows times only. No race distance is claimed.
- Men's tennis has no per-tournament recaps. The one Sep 28 story covers two tournaments and is not matched.
- Soccer Sep 3 (Colorado State) has no matched recap. The official card links the Minnesota recap, and an opponent-site story was refused.
- Cards with no date yet (NCAA swimming) and a softball card with no opponent are left out. Games that publish no result, such as softball Sep 30, are not shown as finals.
- Athlete certification for BYU was not reviewed.

## Setup (route parity)

The module starts as a pure move. Each of BYU's 12 sponsored sports gets exactly the schedule and roster candidates production used before the module existed:
- the four inline schedule and roster routes (Cross Country, Soccer, Volleyball, Football) moved out of `src/index.js`;
- the other sports' generic fallbacks are now written out explicitly.

`combinedSports` keeps the shared policy (Basketball, Swimming & Diving). The three verified Soccer Instagram tags moved too.

A before/after dump of all 438 catalog school/sport schedule and roster routes (plus combination flags) was identical.

`npm run test:byu-module` (also in `npm test` and `npm run test:release`) checks:
- all 12 sports route to byucougars.com through the module;
- no `'byu|` configuration remains in `src/index.js`;
- the program combinations and verified Instagram tags are unchanged.

## Football (`4.36.0-byu-football`)

byucougars.com is a WMT site. Each event is a `schedule-event-item` card holding:
- `<time datetime="2026-09-05T18:00:00.000-06:00">`: the local start, with its offset;
- the published clock (`6:00 PM MDT` or `TBA`);
- a `vs.`/`at` divider and the opponent name;
- the result (`W 63-7`);
- Preview, Recap and broadcast links.

Production (`4.34.0`) ran the shared parsers, which read both these cards and the page's schema data. As a result:
- every upcoming game appeared twice (once as `Oct 3`, once as `Sat. Oct. 3, 2026`);
- a phantom `Nov 28 BYU vs Cincinnati W, 63-7` final reused the Sep 5 score and recap;
- the Iowa State game appeared on both Oct 9 (correct, a Friday) and Oct 10.

`createByuHandlers().parseSchedule` (hook in `parseHtml`) reads the cards itself for the sports in `byuSchool.cardSports` (Football only, for now):
- the date comes from the `datetime` attribute's local date;
- the opponent comes from the name, with rankings dropped; the relation comes from the divider;
- `W 63-7` becomes K-State's `W, 63-7`, with one Result row;
- the card's own Recap link (byucougars.com `/news/`) becomes `recap_url`. The Preview link is never used;
- finals show the date only, as K-State does. Upcoming games show the published time (`Oct 3, 5:00 PM`), stored as Mountain wall clock. `TBA` shows the date only.

A page without cards returns `null`, so the shared parsers still run. Fixture: `tests/fixtures/byu-module/football-schedule.html.gz` (unmodified; see `sources.json`). Expected: 3 finals (`W, 63-7` Utah Tech, `W, 28-17` Arizona, `W, 41-23` at Colorado State) with their recaps, and 9 upcoming.

**Expanded view.** BYU recaps rarely name the sport. For example, the title is "No. 14 BYU Opens Season with 63-7 Win over Utah Tech" and the URL is `/news/2026/09/05/byu-utah-tech`. The shared `recapMatchesEvent` therefore rejected every card recap. Production then fell back to other sources and showed highlights from other teams' games: Arizona vs Northern Arizona on Sep 12, and a Colorado game on Sep 19.

`createByuHandlers().matchesRecap` (hook in `attachOfficialHighlights`) drops only the sport-word requirement, and only for the Recap link of a card in a module card sport (an https byucougars.com `/news/` URL). The article must still name the opponent and match the game date. Every other candidate gets the full shared check.

Fixtures: the three recaps (see `sources.json`). Tests:
- each recap matches only its own game;
- each final keeps its own recap, and the stub AI is given that game's article;
- a wrong card recap leaves the game at `recap_not_found`, with no recap link and no highlights.

## Volleyball (`4.36.1-byu-volleyball`)

Production listed every match twice, once as `Oct 1` and once as `Wed. Oct. 1, 2026`: 12 results and 30 upcoming. Volleyball joins `cardSports`. The reader gains three parts that later sports use:
- **Rankings.** `No. 2 Pittsburgh` is read as Pittsburgh, as `#11 Utah` already was.
- **Plain Recap links.** Volleyball's Recap is a relative `/news/...` link reading "Recap", not Football's `<span>`. Either form counts, and Preview links never do.
- **Internal games.** In game sports, a card with no `vs.`/`at` divider (the Aug 15 Blue-White Scrimmage), or one listing BYU against itself, is skipped.

Result: 11 finals (`W, 3-0` Utah Tech … `W, 3-2` Baylor), each with its own recap, and 17 matches with published times.

## Soccer (`4.36.2-byu-soccer`)

Production listed every game twice, like Volleyball. Soccer joins `cardSports`. Two more reader parts:
- **Tournament cards.** The Nov 9–14 card's opponent is `TBA`. It takes its group heading, minus the sponsor: `BYU vs Big 12 Soccer Tournament`.
- **Recap dates.** A card's recap must be dated, in its URL, between the day before the event and three days after it ends. The official Sep 3 Colorado State card links the Aug 28 Minnesota recap; that link is refused, so the feed shows no recap for that game rather than the wrong one. Football's and Volleyball's recaps are unchanged.

The Aug 1 intrasquad ("vs. BYU", `BLU, 1-0`) is skipped as internal. Result: 11 finals (two `T, 1-1` ties) with 10 recaps, and 9 upcoming with published times.

**A recap must name BYU.** On the preview, the Sep 3 Colorado State expanded view fell through to the shared opponent-site fallback. That fallback took "Colorado State" for Colorado and accepted a cubuffs.com story about Colorado vs New Mexico. `byuHandlers.matchesRecap` now refuses any article whose title and text never say "BYU" or "Brigham Young", whatever site it comes from.

## Cross Country (`4.36.3-byu-cross-country`)

Production read only the women's page and showed both meets as `Completed`, with no race rows. Changes:
- **Both teams.** Cross Country routes to `womens-cross-country` and `mens-cross-country` and is added to `combinedSports`. BYU's teams mostly run different meets, so each meet is labeled by team (`Women's · BYU at Cowboy Jamboree`), with `-womens`/`-mens` event ids. K-State shows both teams in one meet because they run the same meets.
- **Team result.** The card's `1st - 19 points` becomes `Women's team: 1st · 19 pts`. A meet whose last day has passed is final, showing the date only.
- **Race rows.** `byuHandlers.attachMeetResults` (the same three hooks as Utah and Arizona State) reads the meet's card-bound recap, using the BYU recap check. It puts the team row first (`BYU team | 1st · 19 pts`), then BYU's runners from the recap's results tables. The recaps use four table layouts. Other schools' runners are left out. Where a table has no place column (Utah Valley men), the time is shown alone rather than a place guessed from row order.
- **No distance claimed.** Groups read `Women's race` / `Men's race`. The recaps mention splits and other races ("the first 5,000-meters"; an "8,000-meters" that was not that day's race), so a distance read from the prose could be wrong.

Limitation: the tables list the top 10 overall or BYU's scorers, so not every BYU runner appears. The card's Results link (sporttrax.com, live.reddirtrunning.com, mwt.live) is a third-party timing site and is not read.

Shared test change: the regression route check now also accepts a route written as a list (`'byu|Cross Country':['https://byucougars.com/...`).

## Basketball (`4.36.4-byu-basketball`)

Production showed 128 upcoming games: the inherited generic routes plus card/schema duplicates. Basketball now routes only to the two official pages and joins `cardSports`; both teams are labeled, with separate ids. A bracket game listed as `TBD` (Nov 25) takes its tournament heading (`BYU vs Southwest Maui Invitational`), as `TBA` already did. Result: 34 men's and 33 women's games. Most men's times are still TBA on the official page. No game has been played yet.

## Baseball (`4.36.5-byu-baseball`)

Production showed 10 fall games, with duplicates in two date formats. Baseball routes only to its official page (the homepage fallback is gone) and joins `cardSports`. The "Fall 2026" page lists 5 cards: the Oct 30 "vs. BYU" intrasquad is skipped, leaving 4 games (Utah Oct 2, 4:00 PM; SLCC Oct 7, 5:30 PM; at Air Force; at UNLV). Spring 2027 games will appear when byucougars.com publishes them.

## Softball (`4.36.6-byu-softball`)

Production showed 17 fall games, with duplicates. Softball routes only to its official page and joins `cardSports`. Of the 9 cards on the "Softball 2026 (Fall)" page, the Oct 10 noon card names no opponent and is skipped. The Sep 30 Weber State game publishes no result, so it is neither shown as a final nor kept as upcoming. Result: 7 upcoming games with published times. Spring 2027 games will appear when byucougars.com publishes them.

## Golf (`4.36.7-byu-golf`)

Production read only the first route (the women's page) and showed no placings. Golf now:
- routes to both official pages and is added to `combinedSports`, with teams labeled and separate ids;
- joins `cardSports`, reading the card's team place as the result. For example, `9th (María José "MJ" Barragán - T-6th)` gives `9th`, and `T-` becomes `T`.

K-State reads `1st of 12 (864)`, but BYU's cards publish neither the field size nor the score. Result: men's 4th and 3rd, women's 9th and 1st, and 23 upcoming tournaments through May 2027 with published start times. The cards link no recaps; the expanded view uses the shared news-archive search with the BYU recap check.

**Golf recaps.** On the preview, every expanded view used an in-progress story ("Akina, Cougars in fourth as darkness suspends day one"). Its date matched the tournament's first day, and its text could contradict the final place. Now:
- Multi-day meets carry `end_time` (the last day, as Kansas does).
- The shared recap search uses the last day for BYU meets: one school-gated line beside Kansas's in `attachOfficialHighlights`.
- `byuHandlers.matchesRecap` requires a multi-day meet's recap to be dated on or after the last day.
- For Golf, the title must state the final team place ("finish fourth", "takes third", "wins" for first), and a title with "day one", "round one" or "suspends" is refused. In-progress stories are often published on the same last day, and a day-one title can even name the final place (Vuori: "in fourth" after day one; final 4th).

## Tennis (`4.36.8-byu-tennis`)

Production read only the first route (the women's page). Tennis now routes to both official pages, is added to `combinedSports` (teams labeled, separate ids) and joins `cardSports`.
- **Event names.** Men's cards name only the host ("at SMU", "at ITA" twice on Nov 5). For Tennis, the tournament heading (other than "Exhibition") names the event: `Sherwood Invitational`, `ITA Masters`, `ITA Sectional Championships`.
- **Finished tournaments** are final with `Completed`: individual tournaments publish no team result.

Result: men's 4 completed and 4 upcoming; women's USTA SoCal Championships completed (its recap is dated Sep 28, after the Sep 27 finish) and 6 upcoming.

**Multi-day recap dates.** The shared matcher allows a match's recap up to one day after its start. For a BYU event with `end_time`, `matchesRecap` checks against the last day instead, as Kansas does. The women's USTA SoCal recap (dated Sep 28, for Sep 24–27) now opens in the expanded view. Golf's final-recap rules are unchanged.

## Swimming & Diving (`4.36.9-byu-swimming-diving`)

Production read the inherited generic routes and showed 54 upcoming meets, 23 of them duplicated. Swimming & Diving now routes only to the men's and women's official pages and joins `cardSports` (teams labeled, separate ids; it was already combined).
- **Internal meets.** In meet sports, cards for BYU's own squads ("Navy vs. Royal", result "Navy 261 - Royal 235"), the "Alumni Meet" and the "Intersquad Meet" are skipped.
- **Undated cards.** The two NCAA cards with no date yet are left out until they are dated.

Result: 9 men's and 10 women's meets, from the CMU Shootout (Oct 2–3) to the Big 12 Championships (Feb 23–27).

## Gymnastics (`4.37.0-byu-gymnastics`)

Production showed the 2025-26 season (13 results from January 2026) as current. Gymnastics now routes only to `womens-gymnastics` and joins `cardSports`, and the reader gains a current-season filter used by every card sport:
- **Current academic year only (July–June, Mountain time).** A page whose events are all from a past season returns `[]`, flagged as an empty schedule (`byuHandlers.isEmptySchedule`, hooked beside Utah's and Arizona State's). The app shows its empty-schedule note rather than a failed source. Current-season sports are unchanged, including golf's May 2027 events.
- **Decimal scores.** `W 195.675-194.525` reads as `W, 195.675-194.525`. A fixture test dated April 2026 shows the page in K-State's format with its recaps.

The 2026-27 meets will appear when byucougars.com publishes them; no code change is needed.

## Track & Field (`4.37.1-byu-track-field`)

Production returned 502: the inherited `track-and-field` and `track-field` routes do not exist on byucougars.com (the roster route returns 404). Track & Field now:
- routes to `mens-track-and-field` and `womens-track-and-field` (schedule and roster);
- is added to `combinedSports` and joins `cardSports`.

Both pages still show the 2025-26 season, so today Track & Field is a 200 empty schedule. A fixture test dated May 2026 shows those pages in K-State's format, with team finishes such as `Women's team: 2nd · 110 pts`.

**All 12 BYU sports now read the official cards through the module.**

**Two-team empty schedules.** The first preview of this PR returned 502. For combined sports, the shared `labelTeamEvents` returns a new array, so the module's identity check no longer recognized its own past-season result. Gymnastics, with one page, was unaffected. `fetchUrl` now keeps the parse result before labeling, and BYU's empty-schedule clause checks that. The other schools' clauses are unchanged. A test runs both pages through `fetchUrl` and `fetchLive`.

## Volleyball live scores (`4.37.5-byu-volleyball-live`)

User, during BYU at Kansas State on Oct 1: "Let's update this to byu". BYU Volleyball now uses the same ESPN college volleyball scoreboard as K-State (`byuSchool.liveScoreboards`, looked up beside K-State's in `liveScoreboardProviders`). Today's official card goes Live from BYU's side: the big score is BYU's points in the current set, and the status line reads `1st Set · Sets 0-0`. A final reads `W, 3-1` / `L, 1-3`. Matching ignores nicknames (Houston and Washington State are also Cougars). ESPN's feed can lag several minutes, especially between sets. Football already used ESPN by default; Basketball is not configured for BYU.

## Basketball live scores (`4.37.7-byu-basketball-live`)

User: "Add live scores for BYU basketball too". `byuSchool.liveScoreboards.Basketball` adds ESPN's men's and women's college basketball scoreboards, labeled `Men's`/`Women's` to match the official cards, as K-State's are. A live game shows the clock (`2nd Half - 4:12`) and BYU's score. Fixtures: ESPN's real Houston at BYU (men, Feb 7, 2026) and BYU at Houston (women, Jan 10, 2026) events. Both teams are Cougars, so the test checks that BYU gets BYU's side and Houston gets its own. The season starts Oct 16 (men's exhibition vs Nebraska), so a real live game has not been observed yet.
