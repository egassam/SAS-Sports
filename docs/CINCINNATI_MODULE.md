# Cincinnati school module

`src/schools/cincinnati.mjs` owns Cincinnati's gobearcats.com schedule and roster routes, its program combinations, its verified Instagram tags and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Cincinnati was chosen on October 4, 2026 (user: "Convert Cincinnati"; it is the next unconverted Big 12 school in catalog order). gobearcats.com answers the development sandbox directly (HTTP 200), so fixtures are downloaded as the app fetches them, with spacing between requests.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | (this PR) | Card reader: 4 finals `W, 31-26` with their own recaps; 8 upcoming, `Oct 3, 11:00 PM` at Arizona, the rest date only (unscheduled); ESPN live score (shared FBS-group request) |
| Volleyball | | shared parsers |
| Soccer | | shared parsers |
| Cross Country | | shared parsers |
| Basketball | | shared parsers |
| Baseball | | shared parsers |
| Golf | | shared parsers |
| Lacrosse | | shared parsers |
| Swimming & Diving | | shared parsers |
| Track & Field | | shared parsers |

Production survey before the module (October 4, ~01:30 UTC, `4.49.2`):
- **Football:** finals and recaps right; the Oct 3 night game at Arizona listed twice (Oct 3 and Oct 4); a phantom Nov 28 game at BYU carrying the Sep 5 recap; no published times.
- **Volleyball:** rankings in names (`#11 TCU`, `#RV Kansas State`); every ranked upcoming match listed twice (`at #24 Colorado` Oct 29 and `at Colorado` Oct 30); a phantom Baylor recap; no times.
- **Soccer:** the same doubling (Colorado Oct 30/31, West Virginia Nov 5/6), a phantom recap on Nov 5; no times.
- **Cross Country:** `Completed` for all three meets, no race rows; the cards publish team places (`2nd (M), 2nd (W)`).
- **Basketball:** 2 results (the Bahamas summer exhibitions) and 79 upcoming.
- **Golf:** 5 results and 23 upcoming: one event per round.
- **Lacrosse:** the spring 2026 season shown as current (17 results).
- **Baseball:** 57 upcoming, spring 2027. **Swimming & Diving:** 13 upcoming. **Track & Field:** empty.
- The site also publishes a women's tennis schedule (`/sports/womens-tennis/schedule`); Tennis is not in `src/sponsored-sports.json` (see Limitations).

## Setup (route parity)

The module starts as a pure move. Each of Cincinnati's 10 sponsored sports gets exactly the schedule and roster candidates production used before the module existed: the four inline routes (Cross Country, Soccer, Volleyball, Football) and the one verified Soccer Instagram tag moved out of `src/index.js`, and the other sports' generic fallbacks are written out explicitly. A before/after dump of all 219 catalog school/sport routes (schedule, roster, combination flag) was identical. Each sport's routes are corrected in its own PR.

## Cards

gobearcats.com is a WMT site (like ucfknights.com, byucougars.com and thesundevils.com, in its own variant). Each event is a `schedule-event-item` card:
- the start as `<time datetime="2026-10-03T23:00:00.000-04:00">` (Eastern wall clock with its offset) beside the visible day (`Oct 3`); the reader takes the date from the datetime and checks it against the visible day;
- `schedule-default-event__divider` (`vs.` / `at`) and `schedule-default-event__name` (the opponent, with rankings such as `#11 TCU`);
- one result slot: the result (`W Win 31-26`) or the published time (`11:00 PM EDT`); an unscheduled game has the `schedule-event-date--time-tba` class and an empty slot (its datetime holds a placeholder time such as `11:11`, never shown);
- the game's own `Recap` link (`/news/2026/09/27/...`), dated in its URL; it must fall between the game day and three days after.

Cincinnati is in `America/New_York`; times are stored as the school's wall clock, as for every school.

## Football (`4.50.0-cincinnati-football`)

The module reader (`createCincinnatiHandlers().parseSchedule`, Football only via `cardSports`) gives 12 games, one each: 4 finals in K-State's wording (`W, 31-26` vs Kansas State), date only, each with its own recap; `Cincinnati at Arizona Oct 3, 11:00 PM`; 7 unscheduled games with the date alone. The shared recap matcher matches each final to its own recap only, and the expanded view writes highlights from that article.

**Live score.** ESPN's college football scoreboard through the shared FBS-group request (#164). The Sep 26 payload's Kansas State at Cincinnati (`W, 31-26`) joins the official card (no second card).

`npm run test:cincinnati-module` (also in `npm test` and `npm run test:release`) checks route ownership and parity, the Football games from the unmodified fixture, recap matching across all four recaps, highlight generation from each game's own article and the ESPN match. Removing the parse hook fails it.

## Limitations

- **Tennis:** gobearcats.com publishes a women's tennis schedule, but `src/sponsored-sports.json` does not list Tennis for Cincinnati, so the app offers no Tennis page. Adding it changes the shared catalog (decided separately).
