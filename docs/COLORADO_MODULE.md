# Colorado school module

`src/schools/colorado.mjs` owns Colorado's cubuffs.com schedule and roster routes, its program combinations, its verified Instagram tags and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Colorado was chosen on October 4, 2026 (user: "Convert Colorado"). Sports are converted one per PR, each merged under `AGENTS.md` item 6 after the full gate and verified in production. cubuffs.com returns HTTP 403 to the development sandbox, so every official page used as a fixture came through the private source route (`scripts/fetch-official.mjs`), unmodified.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | #214 | Page-data reader: 5 finals `W, 14-13` with their own recaps (the Oct 3 Texas Tech recap was linked after the fixture was taken; the preview shows it); 8 upcoming, `Nov 13, 8:15 PM` vs Houston and `Dec 4, 6:00 PM` Big 12 Championship Game, the rest date only (TBA); ESPN live score (shared FBS-group request) |
| Volleyball | #215 | 13 finals (`W, 3-0`) with their own recaps, 15 upcoming with published times; scrimmage and other teams' tournament matches left out; ESPN live score |
| Soccer | (this PR) | 13 finals (`T, 0-0`, `Utah (Exhibition)`) with their own recaps, 7 upcoming with published times; ESPN live score |
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

**Schedule compaction.** The shared `compactScheduleHtml` cut cubuffs.com football pages down to the cards (a CPU guard for the shared parsers), which dropped the page data after them: the first preview showed no times. Colorado pages are now passed whole (Houston keeps its compaction); the module returns before the shared parsers run. The test now also runs the whole download-and-parse pipeline (`fetchLive`).

`npm run test:colorado-module` (also in `npm test` and `npm run test:release`) checks route ownership and parity, the Football games from the unmodified fixture, recap matching across all four recaps, highlight generation from each game's own article and the ESPN match. Removing the parse hook or the past-game rule, or restoring the Colorado compaction, fails it.

## Volleyball (`4.52.1-colorado-volleyball`)

The page data has 34 entries: the Black and Gold scrimmage, the other teams' matches at Colorado's two home tournaments (`Denver vs. Central Arkansas`, `Northern Colorado vs. Wichita State`, no result), 13 Colorado finals and 15 upcoming matches. Production happened to show the right matches (the other teams' entries have no score and had passed). The module reads 28 matches, one each: finals in K-State's wording, date only (`W, 3-2`), each with its own recap; upcoming with Colorado's published times (`Oct 9, 8:00 PM` at Arizona State). Names written `A vs. B` are other teams' matches and are left out even while upcoming; trailing spaces in names (`Kansas State `) are trimmed.

**Recap matcher (`matchesRecap`, every Colorado sport).** The shared matcher accepted the Aug 28 CSUN story for the Aug 29 Central Arkansas match (the story previews the next day's opponent) and the Sep 18 story at Colorado State for the Sep 17 home match against the same team. A game whose schedule links its own recap now takes only that recap (checked for opponent and date, no sport word needed); any other candidate must also name the opponent in its headline (`og:title`). Across all 13 finals, each matches only its own recap.

**Live score.** ESPN's women's college volleyball scoreboard, as K-State's. The Oct 2 payload (120 matches) holds Colorado at TCU (`L, 1-3`), which joins the official card. BYU's test, which used Colorado as its "no volleyball scoreboard" school, now uses Houston.

## Soccer (`4.52.2-colorado-soccer`)

Colorado sponsors women's soccer only. Production's games and results were right; it showed the Aug 5 exhibition as a plain `Colorado vs Utah` final. The module reads 20 games, one each: 13 finals in K-State's wording, date only (`T, 0-0` at Western Michigan), 12 with their own recaps (the Western Michigan tie links none; the Aug 12 night game's recap is dated Aug 13); 7 upcoming with published times.

**Exhibitions (every Colorado sport).** A page-data entry of type `S` against another school reads `Utah (Exhibition)`, as K-State labels exhibitions (the volleyball Black and Gold scrimmage, also type `S`, stays out as internal).

**Published times (every Colorado sport).** The page shows the time text (`5:30 p.m.`); the page data's clock usually agrees, but at Kansas State (Oct 16) it holds 18:00. The text is what the page shows, so a clock in it wins (`Oct 16, 5:30 PM`, as production showed from the cards).

**Live score.** ESPN's women's college soccer scoreboard (`soccer/usa.ncaa.w.1`); the Oct 2 payload's Colorado at UCF (`L, 0-2`) joins the official card.

## Limitations

- None for Football.
