# Arizona school module

`src/schools/arizona.mjs` owns Arizona's arizonawildcats.com schedule and roster routes, its program combinations, its live scoreboards and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Arizona was chosen on October 2, 2026 (user: "Let's do Arizona next. All sports and live."). arizonawildcats.com refuses the development sandbox (HTTP 403), so every official page used for fixtures was downloaded through the app's private source route (`scripts/fetch-official.mjs`, PR #145), exactly as the app fetches it.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | #148 | Page-data reader: 4 finals `W, 35-7` with their own recaps; 9 upcoming with published Arizona times; ESPN live score (FBS group) |
| Volleyball | #149 | 12 finals with recaps (one names the opponent only as "UCSB"), 17 upcoming with times; rankings dropped; scrimmage and unscored exhibitions left out; ESPN live score |
| Soccer | #150 | 12 finals (`T, 1-1`) with recaps where published, 9 upcoming with times; the Big 12 tournament game named; ESPN live score |
| Cross Country | (this PR) | Race rows from the official recaps: `Women's team: 12th · 280 pts / Men's team: 1st · 85 pts`, `Women's 6K` then `Men's 8K`, every Arizona runner listed |

## Setup (route parity)

The module starts as a pure move. Each of Arizona's 13 sponsored sports gets exactly the schedule and roster candidates production used before the module existed: the five inline routes (Volleyball, Soccer, Cross Country, Football, Swimming & Diving) moved out of `src/index.js`, and the other sports' generic fallbacks are written out explicitly. A before/after dump of all 219 catalog school/sport routes (schedule, roster, combination flag) was identical.

## Page data

arizonawildcats.com is a SIDEARM (Nuxt) site. Each schedule page embeds every game in `__NUXT_DATA__` (read by the shared `sidearmScheduleGames`):
- `date`: the local start (`2026-09-05T18:30:00`; `T00:00:00` when the time is TBA) and `time` (`6:30 PM MST`, `TBA`);
- `location_indicator` (`H`/`A`/`N`) and `at_vs`;
- `result`: `status` (`W`/`L`/`T`, or `N` for meets), `team_score`, `opponent_score`, `prescore_info`/`postscore_info` (meet placings such as `Men: 1st Women: 12th`, golf `7th; 844 (-20)`), and `recap.url`;
- `type` (`R` regular, `P` postseason, `S` exhibition/scrimmage), `enddate` for multi-day events, `tournament`, `noplay_text` (`Canceled`).

Arizona is in `America/Phoenix` (no daylight saving); the page's local times are stored as the school's wall clock, as for every school.

## Football (`4.43.0-arizona-football`)

Production (`4.42.0`) read the rendered cards with the shared SIDEARM parser: finals and recaps were right, but every upcoming game showed its date only. The module reader (`createArizonaHandlers().parseSchedule`, Football only via `pageDataSports`) gives:
- one event per game, rankings (`#21`, `No. 23`) dropped;
- finals in K-State's wording (`W, 35-7`), date only, each with the game's own `/news/` recap (not the game-book PDF);
- upcoming games with the published Arizona time (`Oct 3, 8:00 PM`), or the date alone for `TBA`.

Arizona recaps name the sport ("Football: Noah Fifita throws for 2 TDs ..."), so the shared recap matcher matches each final to its own recap only; no module matcher is needed.

**Live score.** ESPN's college football scoreboard, requested with `limit=1000` as every school does, returns only ~25 featured games: Arizona at Washington State (Sep 26) and Kansas State at Cincinnati were both missing. Arizona's provider asks for the FBS group (`groups=80&limit=300`, 65 games that day). A provider may now carry its own `query`; providers without one send exactly the old request. Arizona's scoreboard finals read `W, 34-24` (K-State's wording) instead of a bare `34–24`, so a final never replaces the official headline with a bare score (gated to Arizona).

`npm run test:arizona-module` (also in `npm test` and `npm run test:release`) checks route ownership and parity, the Football games from the unmodified fixture, recap matching across all four recaps, highlight generation from each game's own article, the scoreboard request and the ESPN match (Kansas State and Kentucky, also "Wildcats", are not Arizona). Removing the parse hook fails it.

## Volleyball (`4.43.1-arizona-volleyball`)

Production showed rankings in opponent names (`Arizona at #21 Colorado`, `#16 USC`, `#10 Creighton`) and dates without times. The page-data reader now gives 12 finals in K-State's wording with their own recaps and 17 upcoming matches with published times (`Oct 2, 6:00 PM`). Rules added for every page-data sport:
- rankings (`#21`, `No. 23`) dropped; exhibitions read `Grand Canyon (Exhibition)` (from `(Exh.)`, `(Exhib.)`, `Exhibition ...`);
- internal events left out (`Red-Blue Scrimmage`, `Red vs. Blue Intrasquad`, `Red-Blue Showcase`), as are canceled or postponed games;
- a game day that has passed with no published score is neither a result nor upcoming (the Grand Canyon and New Mexico exhibitions, played "best two of three" without a score).

**Recap matcher (`matchesRecap`, all Arizona sports).** "Wildcats Back in the Win Column with Four-Set Victory Over Oregon State" never says "volleyball", so the shared matcher refused that game's own recap. As for BYU, Arizona's matcher drops the sport-word check only for the recap the page data links to that game; opponent and date are still required, and other candidates are checked as before.

**Live score.** ESPN's women's college volleyball scoreboard, as K-State's (`limit=1000` lists every match: 45 on Sep 27). That payload showed a second bug: the shared name match's prefix fallback took "Arizona State Sun Devils" (at Cincinnati) for Arizona. For Arizona only the exact ESPN location, name or abbreviation counts now; Kentucky, Kansas State, New Hampshire and Bethune-Cookman Wildcats are not matched either.

## Soccer (`4.43.2-arizona-soccer`)

Arizona sponsors women's soccer only (the route was already the women's page). Production showed rankings (`No. 23 BYU`, `No. 9 UNC`, `No. 17 Colorado`), dates without times, and the Big 12 tournament game as `Arizona vs TBA`. The reader now gives 12 finals (ties `T, 1-1`), 9 upcoming games with published times, and names an unknown bracket opponent after its tournament (`Big 12 Soccer Championship`). The Aug 5 exhibition was played with a score (`T, 0-0`) and a recap, so it stays, labeled `UC Irvine (Exhibition)`.

Three finals (LSU Aug 30, NAU Sep 10, Pepperdine Sep 13) have no recap link on the schedule. The preview's expanded views showed:
- **LSU:** LSU's own official recap of this match ("LSU Soccer Battles Arizona to 1-1 Draw", lsusports.net), found by the shared opponent-site fallback; it names Arizona, the date and the score. Kept.
- **NAU, Pepperdine:** "no exact recap", although Arizona published both ("Arizona Blanks Northern Arizona 3-0", "Arizona Falls at Pepperdine 2-0"). The shared news fallback reads `/sports/<sport>/news`, a 404 on arizonawildcats.com, whose stories are listed at `/sports/<sport>/archives`; Arizona now reads that (one school-gated branch). The NAU story never says "NAU": a story found this way may also name the opponent by its full name from the page data's logo title ("Northern Arizona University Logo"). Sport word and date are still required, and only same-day stories are candidates (the previews are dated the day before).

**Live score.** ESPN's women's college soccer scoreboard (`soccer/usa.ncaa.w.1`, 108 matches on Sep 27). K-State has no soccer scoreboard; the user asked for live scores for Arizona's sports. ESPN's soccer team name is the school name ("Arizona"), which the shared nickname rule discarded, so Arizona's scoreboard match is now exact: ESPN location `Arizona` (or `Arizona Wildcats`) only, in every sport.

## Cross Country (`4.43.3-arizona-cross-country`)

Arizona runs men's and women's teams. Production showed the page's raw team text as the headline (`Men: 1st Women: 12th`, men first) and no race rows. The page data gives each meet's team places (`prescore_info`/`postscore_info`); each recap ends with Arizona's own results per race:

```
Arizona Men's Results (8K)
2. Evans Tanui - 22:41.54
...
Arizona Women's Results (6K)
1. Mercy Chepkemoi - 19:02.52
```

and states the team points in prose ("The men earned 85 points (1st), while the women earned 280 points (12th)."; "... while the women earned 28.").

The module now (`parseArizonaRecapResults`, `attachMeetResults`, the same three school-gated hooks as UCF and BYU):
- reads the meets as `Arizona at Dave Murray Invitational` with the team places, women first;
- builds K-State's race groups from the recap lists: `Women's 4K` / `Men's 6K` (Dave Murray, 18 rows) and `Women's 6K` / `Men's 8K` (Sean Earl, 20 rows), each with the team row first (`Arizona team: 12th · 280 pts`) and every Arizona runner listed (`1st · 19:02.52`);
- writes the headline `Women's team: 12th · 280 pts / Men's team: 1st · 85 pts`; places come from the official schedule, points from the recap;
- uses the results list, not the prose, where they differ (Michael Urbanski: 18:10.0 listed, 18:10.1 in the text);
- writes highlights only from those rows (team finishes, then each race's leader); the AI never reads these recaps; feed and expanded view share the rows;
- refuses a recap that is not this meet's (the official places stay).

Rows are Arizona's runners as the recap lists them (the top finishers overall are not Arizona's and are not listed), as K-State's are.

## Seen outside Arizona (not changed)

- The same ESPN limitation affects every other school's football (K-State at Cincinnati was missing on Sep 26) and basketball (the default men's scoreboard listed 12 of 53 games on Mar 3, 2026; `groups=50` lists all Division I games). Fixing it for K-State, BYU and UCF is a shared change that needs the user's approval.
- The same prefix fallback would take `Kansas State Wildcats` for Kansas (KU) on a football scoreboard. Not changed; shared.

## Limitations

To be completed as each sport is converted.
