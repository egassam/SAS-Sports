# UCF school module

`src/schools/ucf.mjs` owns UCF's ucfknights.com schedule and roster routes, its program combinations and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

UCF was chosen as the next Big 12 school on October 2, 2026 (user: "Add the Next big 12 school"). It is the first unconverted Big 12 school in catalog order whose official site the development sandbox can download. arizonawildcats.com and baylorbears.com still returned HTTP 403; ucfknights.com returned 200.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | #123 | Module card reader: 4 finals `W, 73-6`-style with their own recaps; 8 upcoming with published times |
| Volleyball | #125 | 12 finals with recaps; 16 upcoming with times; ESPN live score (as K-State and BYU) |
| Soccer | #126 | Both teams (women's Big 12, men's Sun Belt), labeled: 9 + 9 finals with recaps; exhibitions and the postponed FIU game left out |
| Cross Country | #127, #137, #138 | Complete TFRRS results: `Women's 5K`, every UCF runner, `Women's team: 1st · 39 pts`, `6th · 199 pts`; recap prose as fallback |
| Basketball | #128 | Men's 35 + women's 34 upcoming, labeled; ESPN live scores for both teams |
| Baseball | #129 | 38 games (fall exhibitions from Oct 17, spring 2027); official page only |
| Softball | #130 | 33 games (fall exhibitions from Oct 16, spring 2027); official page only |
| Golf | #131 | Both teams, one event per tournament: men's `T4th (852)`, `12th (860)`, `5th (858)`; women's `11th (867)`, `8th (843)`, each with its recap; UCF recap matcher |
| Tennis | #132 | Both teams: the men's page is 2025-26, so it is an empty schedule; women's 2 completed fall tournaments with recaps and 4 upcoming |
| Rowing | #133 | Empty schedule (the page shows 2025-26); in season, one event per regatta |
| Track & Field | #134 | Empty schedule (the page shows Jan-Jun 2026); in season, team finishes `UCF team: 15th · 14 pts` |

## Setup (route parity)

The module starts as a pure move. Each of UCF's 11 sponsored sports gets exactly the schedule and roster candidates production used before the module existed:
- the four inline schedule routes (Cross Country, Soccer, Volleyball, Football) moved out of `src/index.js`;
- the other sports' generic fallbacks are now written out explicitly.

`combinedSports` keeps the shared policy (Basketball, Swimming & Diving). A before/after dump of all 438 catalog school/sport schedule and roster routes (plus combination flags and verified Instagram tags) was identical.

## Football (`4.38.0-ucf-football`)

ucfknights.com is a WMT site, a third variant of the `schedule-event-item` card (BYU and Arizona State are the other two). Each card holds:
- the date as `Thu, Sep` / `3`, with no year;
- a `vs.`/`at` divider and the opponent name, with rankings such as `#20/20 Houston` or `#19/- Oklahoma St.`;
- one result slot: the result (`W Win 73-6`) or the published local time (`12:00 PM EDT`, `Time TBA`);
- links: Game Notes, Photo Gallery, Postgame Presser, Box Score and Recap.

The page's JSON-LD lists every game's start in UTC; it supplies each card's year (converted to Eastern time).

Production (`4.37.8`) ran the shared parsers, which read both the cards and the schema data. As a result:
- every upcoming game appeared twice (`Oct 3` and `Sat, Oct 3, 2026`);
- a phantom `Nov 28 UCF at Colorado W, 73-6` final reused the Sep 3 score and recap, and its expanded view showed highlights from a Colorado vs Georgia Tech story.

The module reader (`createUcfHandlers().parseSchedule`, Football only via `cardSports`) gives:
- one event per card, rankings dropped;
- finals with K-State's `W, 73-6` / `L, 7-12` wording, date only, each with the card's own Recap link (dated from the game day to three days after);
- upcoming games with the published Eastern wall-clock time, or the date alone for `Time TBA`.

UCF recaps name the sport ("Football Falls in Pittsburgh 12-7"), so the shared recap matcher already matches each final to its own recap only; no module matcher is needed.

`npm run test:ucf-module` (also in `npm test` and `npm run test:release`) checks route ownership and parity, the Football cards from the unmodified fixture, recap matching across all four recaps, and highlight generation from each game's own article. Mutations fail it: removing the parse hook, or keeping rankings.

## Volleyball (`4.38.1-ucf-volleyball`)

Same card layout as Football. Production showed 13 results and 27 upcoming (duplicates) for 12 played and 16 scheduled matches. The module reader gives one event per card, rankings dropped (`#10 Purdue`), K-State's `L, 2-3` wording and each match's own recap.

Live scores use ESPN's women's college volleyball scoreboard (`ucfSchool.liveScoreboards`; the shared `liveScoreboardProviders` looks it up for UCF as for K-State and BYU). The Oct 2 scoreboard fixture holds three other "Knights" teams (Army Black Knights, Fairleigh Dickinson, Bellarmine); only UCF at Baylor matches.

## Soccer (`4.38.2-ucf-soccer`)

UCF has a women's (Big 12) and a men's (Sun Belt) team. Production loaded only the women's page and showed duplicates (10 results, 24 upcoming). Both pages now load through the module, labeled `Women's`/`Men's` (`combinedSports`), women first, with `-womens`/`-mens` event ids.
- Preseason exhibitions publish `Completed` with no score, and the Sep 3 FIU game reads `Postponed` with no new date; they are left out (not a K-State-style final, not upcoming).
- Bracket cards are named after their tournament heading: `Big 12 Soccer Tournament · Quarterfinal Round`; the men's `TBD` card is `2026 Sun Belt Conference Men's Soccer Championship`.
- Rankings in every form are dropped (`#17/17 Colorado`, `-/#21 LSU`). Ties read `T, 1-1`.
- On Sep 27 both teams played (women at Utah, men vs Kentucky); the shared matcher keeps each recap to its own game (tested).

## Cross Country (`4.38.3-ucf-cross-country`)

UCF runs a women's team only. Cards give the team place (`1st`, `6th`); recaps are prose, with no results tables. Production read the prose with the AI in the expanded view and showed Southern Showcase as `1st · 199 pts` (UCF was 6th of 31); the feed showed `Completed` and duplicate upcoming meets.

The module now:
- reads the meet cards (`UCF at Florida Intercollegiate`, as K-State's meets read), the team place from the card, and the published start time for upcoming meets;
- reads the team points from the recap sentence about UCF ("The Knights finished with 43 points");
- reads runner rows deterministically (`parseUcfRecapResults`): each runner's name links to the roster, and the text up to the next linked name holds the place and time ("finishing sixth in 17:58.09", "in 13th at 18:13.84", "a 29th-place finish in 18:36.02", "crossed in 18:30.0 to finish 104th"). A time with no place counts only as "with a time of …". Earlier marks ("best of", "record of", "debut time of") are skipped, so the 2013 program-record holder named in the story is never a row;
- requires the recap's own title to name the meet (the Southern Showcase story mentions the Florida Intercollegiate);
- uses the same rows in the feed and the expanded view (the same three school-gated hooks as BYU); the AI never reads these recaps.

Groups read `Women's race`: the recaps never state the race distance, so none is claimed (as for BYU). Rows are the runners the recap names (8 and 9), not the full field.

## Basketball (`4.38.4-ucf-basketball`)

Production loaded the men's and women's pages plus the generic `/sports/basketball/` page and the homepage, and showed 132 upcoming games for 69 cards. Basketball now routes to the two official pages only and reads their cards: men's 35 and women's 34, labeled. The season starts Oct 14.
- The men's Big 12 tournament card names its opponent "Big 12 Conference" under a heading with a stale year ("2025 Phillips 66 Big 12 Men's Basketball Championship" on the 2026-27 page). Multi-day conference cards are named after the heading without the year.
- Live scores: ESPN's men's and women's college basketball scoreboards (`ucfSchool.liveScoreboards.Basketball`), labeled as BYU's are. Tested on real finals: Oklahoma State at UCF (men, Mar 3, 2026, 104-111, with Army Black Knights playing the same night) and UCF at Houston (women, Mar 1, 72-62).

## Baseball (`4.38.5-ucf-baseball`)

The page is "Baseball 2027": fall exhibitions from Oct 17, then the spring season. Production also read the homepage and showed 59 upcoming. Baseball now routes to the official page only and reads its cards: 38 games, with spring dates in 2027 (from the schema dates). The intrasquad "Black & Gold World Series" (Nov 13-15) is left out. The reader skips internal events by name for every sport (`scrimmage`, `intrasquad`, `Black & Gold`, or two squads joined by "vs.").

## Softball (`4.38.6-ucf-softball`)

"Softball 2026-27": fall exhibitions from Oct 16, then the spring season. Production also read the homepage and showed 57 upcoming. Softball now routes to the official page only: 33 games. The two "Open Scrimmage" cards and the three "Knights vs. 'Nauts" cards (two squads, read as internal like BYU's "Navy vs. Royal"; the card gives no opponent) are left out.

## Golf (`4.38.7-ucf-golf`)

ucfknights.com publishes one card per round ("T7, 573 (-3)" after round two, "5th, 858 (-6)" after the last). Production showed every round as its own event (10 results, 27 upcoming) and loaded the homepage too. Golf now loads the men's and women's pages only, labeled (`combinedSports`), and the module merges a tournament's consecutive round cards into one event from its first to its last day (`end_time`). The last round gives the final place and total, written as Arizona State's are (`5th (858)`; the field size is not published), and the recap from the last round's card. Upcoming tournaments keep their first round's tee time.

**UCF recap matcher (`matchesRecap`, all UCF sports).** The shared matcher keeps only an opponent's words of four letters or more, so "FAU Invitational" became "invitational": it accepted the women's Schooner Classic story for the men's FAU Invitational. In the expanded view's recap search, UCF now uses its own matcher (one school-gated branch beside BYU's):
- a link other than the card's own Recap must name the event in full (`Kansas St.` may read `Kansas State`);
- a men's or women's event refuses the other team's story (title or URL);
- multi-day events are checked against their last day;
- the shared opponent, sport and date checks still apply.

## Tennis (`4.38.8-ucf-tennis`)

Both teams' official pages only, labeled (production also loaded the homepage and generic pages; 10 upcoming, of which several were duplicates).
- **Current-season filter (all UCF sports):** a card whose schema date lies outside the current academic year (July-June, Eastern) is left out, and a page with none left is a valid empty schedule (`isEmptySchedule`, the same school-gated `empty_schedule` hook as BYU). The men's page still shows the 2025-26 season, so it is empty until UCF publishes 2026-27.
- **Multi-day tournaments:** the women's fall cards span several days (`Sat, Sep 19 - Sun, Sep 27`). They end on the last day (`end_time`); one is over, and reads `Completed` as BYU's do, only after that day. The recap may be dated from the first day to three days after the last (the ITA All-American story is dated Sep 26, before the Sep 27 finish).

## Rowing (`4.38.9-ucf-rowing`)

Production tried `/sports/womens-rowing/schedule` (404) and fell back to the homepage, whose ticker gave 10 "upcoming" events from other sports. Rowing now routes to the official `/sports/rowing/schedule` only. That page still shows "Rowing 2025-26", so today it is an empty schedule. Fixture-tested in season (the same page read as of April and June 2026): regatta days merge into one event as golf rounds do, the last day's recap is kept (a day-one story is not the result), and the Miami and Iowa scrimmages are left out.

## Track & Field (`4.39.0-ucf-track-field`)

Production tried `/sports/track-field/schedule` (404) and the homepage, and showed the 2025-26 season as current: 18 `Completed` meets with last season's recaps. Track & Field now routes to the official page only. That page still shows "Track and Field 2026" (Jan-Jun 2026), so today it is an empty schedule. Fixture-tested in season (the same page read as of June 2026): one event per meet, multi-day meets ending on their last day, and team finishes reading `UCF team: 15th · 14 pts` (the result slot's "15th - 14 Pts."). The UCF-hosted "Black and Gold Challenge" stays: the "Black & Gold" internal rule applies to games only (baseball's intrasquad World Series).

## Certification (`4.39.1-ucf-xc-highlights`)

`tests/validate-schools.mjs --deep` against production on October 2 (all 11 sports): Football, Volleyball, Soccer, Basketball, Baseball, Softball and Golf passed; Cross Country failed (2 highlights per meet, certification needs 3); Tennis failed once on an AI timeout; Rowing and Track & Field return `[]` (empty schedule) where the validator expects one sport group. Athlete checks (`--athletes-only`) passed 11/11 with 3 verified athletes each.
- Cross Country highlights are now the team finish, the leader and the next finishers, all from the verified recap rows (up to 4).
- `tests/certified-schools.json`: UCF athlete coverage extended from 4 to all 11 sports (minimum 3 each), reviewed October 2.

## Cross Country, complete results (`4.39.2-ucf-xc-tfrrs`)

The recaps name only some runners (Florida: 8 with times, 2 without; Southern Showcase: 9). The official cards' "Results" links go to MileSplit and AthleticLIVE (XpressTiming), which return JavaScript shells with no results in the page. TFRRS, the collegiate results database the Worker already reads for other schools, publishes both meets as plain tables. UCF's TFRRS team page lists each meet with its date.

The module now reads TFRRS first (`findUcfTfrrsMeet`, `parseUcfTfrrsResults`):
- the meet is found by the card's date and name (the 2025 Southern Showcase is a different meet);
- rows come from UCF's women's race: the team row with the scored result, then every UCF runner, grouped `Women's 5K` as K-State's are;
- only when TFRRS's team place matches the official card; otherwise the recap prose is read as before.

Where TFRRS and the recap disagree, the scored results are shown: Florida Intercollegiate 39 points (1+6+7+12+13; the recap says 43); Sarah Rose 105th at Southern Showcase (the recap says 104th). Times are TFRRS's tenths (16:52.9; the recap gives 16:52.88).

## Limitations

Each item below is either still open (and listed as such in the handoff) or shown to be impossible to fix from the official sources, with the evidence.

- **Athlete certification:** passed for all 11 sports on October 2 (3 verified athletes each), now covered in `tests/certified-schools.json`.
- **Golf field size: not published.** The cards give only the place and total ("5th, 858 (-6)"); the recaps and the 2026-27 statistics PDF (Sep 23) give no field size. Golf therefore reads `5th (858)` (as Arizona State's), not K-State's `5th of 15 (858)`. Conflict noted: the statistics PDF lists the Cougar Classic total as 857, while the card and the recap both say 867 (+15); 867 is shown.
- **Rowing, Track & Field, men's Tennis: no 2026-27 schedule yet.** The pages show "Rowing 2025-26", "Track and Field 2026" (Jan-Jun 2026) and "Men's Tennis 2025-26"; they are empty schedules until UCF publishes the new season, with no code change needed (fixture-tested in season).
- **Open: the validator and empty schedules.** `tests/validate-schools.mjs` expects one sport group, but every school's empty schedule returns `[]` (BYU Gymnastics too), so Rowing and Track & Field fail it while the app shows the empty-schedule note. Changing the validator is a shared change and needs the user's decision.
- **Open: expanded-view AI timeouts.** About 1 in 15 opens shows `ai_failed` (the 8 s Workers AI limit) although the recap matched; a retry works. Shared code; needs the user's decision.
