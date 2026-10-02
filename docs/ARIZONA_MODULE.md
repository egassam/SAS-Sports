# Arizona school module

`src/schools/arizona.mjs` owns Arizona's arizonawildcats.com schedule and roster routes, its program combinations, its live scoreboards and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Arizona was chosen on October 2, 2026 (user: "Let's do Arizona next. All sports and live."). arizonawildcats.com refuses the development sandbox (HTTP 403), so every official page used for fixtures was downloaded through the app's private source route (`scripts/fetch-official.mjs`, PR #145), exactly as the app fetches it.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | #148 | Page-data reader: 4 finals `W, 35-7` with their own recaps; 9 upcoming with published Arizona times; ESPN live score (FBS group) |
| Volleyball | #149 | 12 finals with recaps (one names the opponent only as "UCSB"), 17 upcoming with times; rankings dropped; scrimmage and unscored exhibitions left out; ESPN live score |
| Soccer | #150 | 12 finals (`T, 1-1`) with recaps where published, 9 upcoming with times; the Big 12 tournament game named; ESPN live score |
| Cross Country | #151 | Race rows from the official recaps: `Women's team: 12th · 280 pts / Men's team: 1st · 85 pts`, `Women's 6K` then `Men's 8K`, every Arizona runner listed |
| Basketball | #152 | Men's 39 (3 summer-tour finals with recaps) + women's 33, labeled, published times, exhibitions labeled; ESPN live scores for both teams (Division I group) |
| Baseball | #153 | 59 games: 4 fall exhibitions from Oct 9 (labeled), then spring 2027; published times; doubleheaders kept as Game 1 / Game 2; ESPN live score |
| Softball | #154 | 35 games: 7 fall exhibitions from Oct 17 (the UTEP doubleheader as two games), then spring 2027; postseason events end on their last day; ESPN live score |
| Beach Volleyball | #155 | Was 502: routes fixed to `womens-beach-volleyball`; 5 fall events, tournaments named, multi-day events end on their last day |
| Golf | #156 | Both teams, one event per tournament: `12th of 12 (909)`, `9th of 15 (857)`, `4th of 12 (866)`, `7th (844)`, with Arizona's individual scores from each tournament's story |
| Gymnastics | #157 | Empty schedule (the page still shows 2025-26); routes fixed to `womens-gymnastics`; in season `W · 195.425`, `3rd · 193.350` with recaps |
| Swimming & Diving | #158 | Both teams, one event per meet (13 men's, 14 women's; was 81 per-day rows); intrasquad left out; published times |
| Tennis | #159, #161 | Both teams, tournaments in progress kept as today's; a past tournament (no team result) is listed only with Arizona's story about it (the Kinlen Invite) |
| Track & Field | #160 | Empty schedule (the page still shows 2025-26); official route only; in season one event per meet, recaps dated with their meet |

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

## Basketball (`4.43.4-arizona-basketball`)

Production loaded the men's and women's pages plus the generic `/sports/basketball/` page and the homepage. Basketball now routes to the two official pages only, both labeled (`combinedSports`), with `-mens`/`-womens` event ids (both teams play at Kansas State on Jan 9). The reader gives:
- men's 39 games (40 less the Red-Blue Showcase): the three August summer-tour games in Lithuania, played with scores and recaps, are finals (`L, 88-99`); exhibitions read `San Francisco (Exhibition)`; published times (`Nov 2, 8:00 PM`);
- women's 33 games, exhibitions `Embry-Riddle (Ariz.) (Exhibition)` (published "Exhibition Embry-Riddle (Ariz.)");
- conference tournaments named after the event and ending on their last day: `Big 12 Tournament` (Mar 9-13), `Phillips 66 Big 12 Women's Basketball Tournament` (published opponent "Big 12 Conference", Mar 3-8).

The Maui Invitational's later rounds keep their published opponents (`VCU or Providence`, `BYU/Clemson/Ole Miss/Washington`).

**Recap matcher, day rule.** The shared matcher accepts a story dated a day before or after the game; the Aug 19 story ("Arizona Opens Lithuania Tour with 99-88 Loss") names the next opponent, Ukraine, and was accepted for the Aug 20 game. For Arizona, a story other than the game's own recap link must be dated on the game day (through the last day of a multi-day event).

**Live scores.** ESPN's men's and women's college basketball scoreboards, labeled to match the official pages. Without the Division I group ESPN lists only featured games (men's: 2 of 23 on Mar 1, 2026), so Arizona's providers ask for `groups=50&limit=300`. Tested on Feb 14, 2026: men's Texas Tech at Arizona (`L, 75-78`) among ten other "Wildcats" games and Northern Arizona; women's Arizona State at Arizona (`L, 69-75`, Arizona the school, not Arizona State).

## Baseball (`4.43.5-arizona-baseball`)

"2027 Baseball Schedule": fall games ("Fall Schedule", type `S`) from Oct 1, then the spring season from Feb 19, 2027. Production also loaded the homepage and showed only the 55 spring games, dates alone. Baseball now routes to the official page only and reads 59 games:
- the fall games read `Pima Community College (Exhibition)` (baseball and softball fall games are exhibitions); the Oct 1 game vs Naranjeros de Hermosillo was played without a published score and is left out;
- published times (`Feb 19, 10:00 AM`), the date alone for `TBA`;
- a doubleheader (the same opponent twice on one day) stays two games, `Game 1` and `Game 2` (`game_number`, as Utah's); the 2027 page has none yet (fixture-tested by moving a game).

**Live score.** ESPN's college baseball scoreboard (`baseball/college-baseball`; the default request lists every game ESPN carries: 78 on Apr 10, 2026, including Arizona at TCU, `W, 4-3`, and Utah at Arizona State).

## Softball (`4.43.6-arizona-softball`)

"2027 Softball Schedule": fall games from Oct 9, then the spring season from Mar 12, 2027. Production also loaded the homepage and showed only the 28 spring games, dates alone. Softball now routes to the official page only: 35 games, the two Red vs. Blue scrimmages left out; fall games labeled exhibitions; the Oct 17 UTEP doubleheader as `Game 1` (2:00 PM) and `Game 2` (4:00 PM); the Big 12 tournament and NCAA rounds end on their last day.

**Live score.** ESPN's college softball scoreboard (`baseball/college-softball`, 53 games on Apr 10, 2026, including Arizona at LSU `L, 1-4` and UCF at Arizona State).

## Beach Volleyball (`4.43.7-arizona-beach-volleyball`)

Production answered 502 ("All official source candidates failed"): the inherited routes were `/sports/beach-volleyball/schedule` and the homepage, and `/sports/beach-volleyball/` renders SIDEARM's empty "@season @sport" template. The sport's pages are `womens-beach-volleyball` ("2027 Beach Volleyball Schedule"); the roster route is fixed the same way. The page lists five fall 2026 events: three tournaments published with a `TBD` opponent, now named after their tournament (`Sand Court Experts Collegiate Beach Fall Classic`, Oct 9-11), and duals at Arizona State and Grand Canyon. Multi-day events end on their last day.

**Reader change for every dual sport (beach volleyball, tennis, swimming):** a dual with a published score reads as a game (`W, 3-2`); without one it reads as a meet, final only after its last day.

ESPN publishes no beach volleyball scoreboard, so there is no live score (K-State has none either).

## Golf (`4.43.8-arizona-golf`)

Production loaded the first golf page that answered (women's) and showed every round as its own event (`7th; 284 (-4)`, `6th; 563 (-13)`, `7th; 844 (-20)`), 24 upcoming round entries, and nothing for the men. Golf now loads both teams' official pages only, labeled (`combinedSports`), and:
- merges a tournament's consecutive round entries into one event from its first to its last day (`end_time`); the last round's entry gives the place, total and recap (a day-one story is not the result); a tournament in progress shows its next round; NCAA rounds publish their last day in the time field (`05/19/2027`);
- uses the tournament's full name (`Folds of Honor Collegiate`, from the page's tournament title, for the card's "Folds of Honor");
- reads each tournament's own story (`parseArizonaGolfRecap`, `attachGolfResults`; feed and expanded view share it). Arizona's golf stories end with two tables, "Arizona Individual Scores" and "Team Standings". The headline becomes K-State's `12th of 12 (909)`: Arizona's place and total from the standings (Arizona, not Arizona State, which is also listed), the field size from the number of teams. The Red Sky story lists only "Team Standings (Top 10)", so it reads `7th (844)` and no field size is claimed. Arizona's golfers follow as `Men's Individual Results` rows (`T11th · 210 (-6)`), and the highlights are written from these rows only;
- the schedule never published the men's Tucker Intercollegiate result (Sep 25-26: no place, no recap). Its story ("Arizona Finishes Ninth at William H. Tucker Intercollegiate") is in the men's golf archive, dated the last day; the module finds it there (the story's address must name the tournament and golf), and the event reads `9th of 15 (857)`.
- the story's place and total must agree with the schedule's when the schedule publishes them; otherwise the schedule's stay.

ESPN publishes no college golf scoreboard, so there is no live score (K-State has none).

## Gymnastics (`4.43.9-arizona-gymnastics`)

Arizona sponsors women's gymnastics. The inherited routes also tried `mens-gymnastics` and `gymnastics` (both the empty "@season @sport" template) and the homepage; schedule and roster now route to `womens-gymnastics` only. That page still shows "2025-26 Gymnastics Schedule" (Dec 13, 2025 - Apr 1, 2026).
- **Current-season filter (every Arizona page-data sport):** only the current academic year (July-June, Arizona time) is current. A page with no current events is a valid empty schedule (`arizonaHandlers.isEmptySchedule`, the same school-gated `empty_schedule` hook as BYU and UCF): the app shows its empty-schedule note, not a failed source. It fills in when Arizona publishes 2026-27, with no code change.
- **In season** (the same page read as of Mar 15, 2026): meets read `Arizona at Washington` with `W · 195.425` (a dual) or `3rd · 193.350` (a multi-team meet), each with its recap; the canceled Iowa State meet is left out; the opening GymCat Showcase (an exhibition with no score) reads `Completed`.

ESPN publishes no college gymnastics scoreboard, so there is no live score.

## Swimming & Diving (`4.43.10-arizona-swimming-diving`)

Production showed 81 "upcoming" rows: one per meet day for each team (USA Diving Nationals alone was 14 rows) and the Red vs. Blue Intrasquad. The page data lists every meet day as its own entry, so Swimming & Diving joins golf's merge: consecutive days of the same meet become one event ending on its last day (`SMU Classic`, Oct 9-10; `USA Diving Nationals`, Dec 9-15). The men's page reads 13 meets, the women's 14 (they also host Northern Arizona), labeled, with published times where the page's time agrees with its date (the women's Nov 6 entry publishes "1:00 PM ... / 6:00 PM" for a 6 PM start, so it shows the date only).

In season, a dual with a published score reads as K-State's games do (`W, 160-140`); a meet whose last day has passed with no published result reads `Completed` (as UCF's), and a published finish in another form is shown as published. Neither page has a 2026-27 result yet. ESPN publishes no swimming scoreboard.

## Tennis (`4.43.11-arizona-tennis`)

Production loaded the first tennis page that answered (women's) and read 8 tournaments as `Arizona vs W35 Las Vegas`. Tennis now loads both teams' official pages only, labeled (`combinedSports`), 10 men's and 10 women's fall tournaments:
- tournaments read as meets (`Arizona at ITA All Americans`) and end on their last day (`enddate`);
- **a multi-day event in progress stays on the schedule** as today's (`In progress`): on Oct 2 the men's University of Arkansas M15 Open (Sep 28 - Oct 4) and Battle of the Bay (Oct 1-4). Before, an upcoming event whose first day had passed fell off the schedule (every Arizona page-data sport now keeps it);
- fall tournaments publish no team result, so a past one reads `Completed`. The schedule links no stories; Arizona's story about a tournament, found in the team's tennis archive, dated within the tournament or the day after, and naming it in its own text, becomes its recap (feed hook beside golf's; the expanded view attaches it first, because it runs before the feed hook: the preview showed `recap_not_found` until then): the men's Kinlen & Vivian Gee Wildcat Invite (Sep 11-13) has "Wildcats Close Out a Successful Weekend at Home" (Sep 14). That story also mentions the ITA All American Tournament, which is outside its dates. The men's ITA All Americans and the women's ITA All-Americans and W50 Berkeley have no Arizona story (the women's archive has only the Sep 2 schedule announcement);
- recaps of multi-day events are checked against their last day.

**Past tournaments without a story (`4.43.13-arizona-tennis-stories`).** Production certification (`validate-schools.mjs --deep`) failed Tennis: the women's W50 Berkeley, ITA All-Americans and the men's ITA All Americans have no Arizona story, so their expanded views had no verified highlights. As K-State's feed lists no past tournament without a team result, Arizona's lists a past tournament only when Arizona published a story about it (today the Kinlen Invite); in-progress and upcoming tournaments stay. ESPN publishes no tennis scoreboard.

## Track & Field (`4.43.12-arizona-track-field`)

The page still shows "2025-26 Track and Field Schedule" (Dec 6, 2025 - Jun 14, 2026), so Track & Field is a valid empty schedule (the current-season filter, `empty_schedule`) until Arizona publishes 2026-27. Production also tried `track-field` and the homepage; schedule and roster now route to `track-and-field` only.

Fixture-tested in season (the same page read as of Apr 10, 2026): 21 meets (the canceled Willie Williams Classic and Jim Click Invitational left out), multi-day meets ending on their last day, past meets `Completed` (the page publishes no team finishes for track).

**Recap date window (every Arizona sport).** The indoor Big 12 Championships (Feb 27-28) link the May 14 outdoor championships story. A page-data recap link must now be dated from the event's first day to three days after its last (the Axe'em Open's story is dated the day after the meet and stays).

ESPN publishes no track scoreboard.

## Seen outside Arizona (not changed)

- The same ESPN limitation affects every other school's football (K-State at Cincinnati was missing on Sep 26) and basketball (the default men's scoreboard listed 12 of 53 games on Mar 3, 2026; `groups=50` lists all Division I games). Fixing it for K-State, BYU and UCF is a shared change that needs the user's approval.
- The same prefix fallback would take `Kansas State Wildcats` for Kansas (KU) on a football scoreboard. Not changed; shared.

## Certification

`tests/validate-schools.mjs --deep` against production on October 2 (all 13 sports): 11/13 on the first run. Football failed once with "fetch failed" (a network error; the immediate rerun passed 4/4), and Tennis failed (three past tournaments without an Arizona story, fixed in #161; the preview then passed 1/1). After #161 and #162 the full set passed 13/13 (later passes again showed occasional client-side "fetch failed" errors in the sandbox, each passing on rerun). Every other sport passed with each final's expanded view verified: Volleyball 12/12, Soccer 12/12, Cross Country 2/2, Basketball 3/3, Golf 4/4; Gymnastics and Track & Field are verified empty schedules.

Athletes (`--athletes-only`): 12 sports pass with 3 verified athletes each (official roster profiles with personal Instagram links, each from that sport's own roster). `tests/certified-schools.json` now protects those 12 sports (minimum 3, reviewed October 2).

## Limitations

Each item is either fixed or shown to be impossible to fix from the official sources, with the evidence.

- **Baseball athletes: the roster is not published.** `/sports/baseball/roster` is the "2027 Baseball Roster" with no players (the page data's `rosterPlayers` is empty; the 2026 roster is a separate season page). Featuring last season's roster would show players who have left, so Baseball has no featured athletes and is not in the protected athlete list until Arizona publishes the 2027 roster (no code change needed).
- **Gymnastics, Track & Field: no 2026-27 schedule yet.** The pages show "2025-26 Gymnastics Schedule" and "2025-26 Track and Field Schedule"; both are verified empty schedules until the new seasons are published (fixture-tested in season).
- **Red Sky Classic field size: not published.** Its story lists "Team Standings (Top 10)" only, so it reads `7th (844)`; the other three tournaments read `Nth of N`.
- **Tennis past tournaments without a story** (men's ITA All Americans, women's ITA All-Americans and W50 Berkeley): Arizona's archives hold no story about them (men's: only the Sep 16 preview; women's: only the Sep 2 schedule announcement) and the schedule publishes no result, so they are not listed (as K-State lists none).
- **Track & Field team finishes:** the page publishes none (the result slots are empty for every 2025-26 meet), so past meets read `Completed` with their recap.
- **Soccer:** LSU's expanded view uses LSU's own official recap of the match (Arizona published none; the shared opponent-site fallback).
- **Live scores:** Football, Volleyball, Soccer, Basketball (both teams), Baseball and Softball use ESPN scoreboards, tested on real past games. ESPN publishes none for cross country, golf, tennis, swimming, gymnastics, beach volleyball or track. A real Arizona game going live was not observed during the session's first part (see the handoff for the evening check).
