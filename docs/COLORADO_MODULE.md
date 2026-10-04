# Colorado school module

`src/schools/colorado.mjs` owns Colorado's cubuffs.com schedule and roster routes, its program combinations, its verified Instagram tags and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Colorado was chosen on October 4, 2026 (user: "Convert Colorado"). Sports are converted one per PR, each merged under `AGENTS.md` item 6 after the full gate and verified in production. cubuffs.com returns HTTP 403 to the development sandbox, so every official page used as a fixture came through the private source route (`scripts/fetch-official.mjs`), unmodified.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | (this PR) | Page-data reader: 5 finals `W, 14-13` with their own recaps (Oct 3 Texas Tech has none published yet); 8 upcoming, `Nov 13, 8:15 PM` vs Houston and `Dec 4, 6:00 PM` Big 12 Championship Game, the rest date only (TBA); ESPN live score (shared FBS-group request) |
| Volleyball | | shared parsers |
| Soccer | | shared parsers |
| Cross Country | | shared parsers |
| Basketball | | shared parsers |
| Golf | | shared parsers |
| Skiing | | shared parsers |
| Tennis | | shared parsers |
| Track & Field | | shared parsers |

Production survey before the module (October 4, ~03:45 UTC, `4.51.0`):
- **Football:** finals and recaps right; no published times (Nov 13 8:15 PM, Dec 4 6:00 PM shown as dates).
- **Volleyball, Soccer:** finals and recaps look right; upcoming times present.
- **Cross Country:** headlines `M-1st/W-1st`, `M-3rd/W-NTS`, no race rows; postseason meets read `vs`.
- **Basketball:** 65 upcoming from four candidate pages (men's, women's, generic page, homepage).
- **Golf:** women's page only (the first that loaded), one event per round (`Colorado vs Second Round`).
- **Skiing:** last season's carnival races shown as current results, one event per race (`20K Freestyle (M) at Soldier Hollow`).
- **Tennis:** women's page only, one event per tournament day (`Colorado vs Day 3`, `NTS`).
- **Track & Field:** empty response.

## Setup (route parity)

The module starts as a pure move. Each of Colorado's 9 sports gets exactly the schedule and roster candidates production used before the module existed: the four inline routes (Cross Country, Soccer, Volleyball, Football) and the one verified Football Instagram tag moved out of `src/index.js`, and the other sports' generic fallbacks are written out explicitly. A before/after dump of all 220 catalog school/sport routes (schedule, roster, combination flag) was identical. Each sport's routes are corrected in its own PR.

## Page data

cubuffs.com is a SIDEARM (Nuxt) site, like baylorbears.com and arizonawildcats.com. Each schedule page embeds every game in `__NUXT_DATA__`: the local start (`2026-11-13T20:15:00`, `8:15 PM`; `TBA` games carry midnight), home/away/neutral (`H`/`A`/`N`), the result (status `W`/`L`/`T`, both scores) and the game's own recap link. The module reads it with the shared `sidearmScheduleGames`/`sidearmStartTime`. Colorado is in `America/Denver`; times are stored as the school's wall clock, as for every school.

## Football (`4.52.0-colorado-football`)

The module reader (`createColoradoHandlers().parseSchedule`, Football only via `pageDataSports`) gives 13 games, one each: 5 finals in K-State's wording, date only, each with its own recap where one is published (the game-book PDF and the notes page are never taken); 8 upcoming games with Colorado's published times or the date alone. Rankings are dropped from names; internal games (scrimmages, Black & Gold) are left out; a past game day with no score is left out after a day.

**Live score.** ESPN's college football scoreboard through the shared FBS-group request (#164). The Sep 26 payload's Colorado at Baylor (`L, 13-23`) joins the official card; Colorado State in the same payload is never taken for Colorado.

`npm run test:colorado-module` (also in `npm test` and `npm run test:release`) checks route ownership and parity, the Football games from the unmodified fixture, recap matching across all four recaps, highlight generation from each game's own article and the ESPN match. Removing the parse hook or the past-game rule fails it.

## Limitations

- Oct 3 Texas Tech: no recap linked on the schedule yet; it appears when cubuffs.com links one.
