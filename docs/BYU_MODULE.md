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
