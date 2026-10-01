# BYU school module

`src/schools/byu.mjs` owns BYU's byucougars.com schedule and roster routes, its program combinations, its verified Instagram tags and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

BYU was chosen as the next Big 12 school on October 1, 2026 (user: "Let's add the next big 12 school"). It is the first unconverted Big 12 school in catalog order whose official site the development sandbox can download. arizonawildcats.com and baylorbears.com still returned HTTP 403; byucougars.com returned 200.

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
