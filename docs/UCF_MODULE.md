# UCF school module

`src/schools/ucf.mjs` owns UCF's ucfknights.com schedule and roster routes, its program combinations and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

UCF was chosen as the next Big 12 school on October 2, 2026 (user: "Add the Next big 12 school"). It is the first unconverted Big 12 school in catalog order whose official site the development sandbox can download. arizonawildcats.com and baylorbears.com still returned HTTP 403; ucfknights.com returned 200.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | #123 | Module card reader: 4 finals `W, 73-6`-style with their own recaps; 8 upcoming with published times |
| Volleyball | #125 | 12 finals with recaps; 16 upcoming with times; ESPN live score (as K-State and BYU) |
| Baseball, Basketball, Cross Country, Golf, Rowing, Soccer, Softball, Tennis, Track & Field | — | Still on the shared parsers; to be checked one sport at a time |

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

## Limitations

- Athlete certification for UCF was not reviewed.
- No past-season filter yet: Football's page shows only 2026. Spring sports will need one, as BYU and Arizona State did.
