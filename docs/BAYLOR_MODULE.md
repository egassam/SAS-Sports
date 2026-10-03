# Baylor school module

`src/schools/baylor.mjs` owns Baylor's baylorbears.com schedule and roster routes, its program combinations, its live scoreboards and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Baylor was chosen on October 3, 2026 (user: "Next school conversion"; Baylor is the next unconverted Big 12 school in catalog order). baylorbears.com refuses the development sandbox (HTTP 403), so every official page used for fixtures was downloaded through the app's private source route (`scripts/fetch-official.mjs`, PR #145), exactly as the app fetches it.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | (this PR) | Page-data reader: 4 finals `W, 23-13` with their own recaps; 9 upcoming with published Baylor times; ESPN live score (shared FBS-group request) |

Production survey before the module (October 3, ~16:55 UTC, `4.46.1`):
- **Football, Volleyball, Soccer:** finals and recaps right; every upcoming game shows its date only.
- **Basketball:** both teams labeled, dates only, 69 upcoming; exhibitions written `(EXH)` and `(Exhibition)`; bracket games named `Players Era Semifinals`.
- **Baseball, Softball:** 59 and 54 upcoming, dates only; softball tournament placeholders (`TBD`, `Aggie Classic`).
- **Cross Country:** `Completed` for two of three meets, no race rows.
- **Golf:** women's page only (the first that loaded), one event per round (`Schooner Fall Classic` three times, `Tennessee Intercollegiate` twice upcoming).
- **Tennis:** women's page only; tournaments as `Baylor vs ITA Texas Regional Championship`.
- **Track & Field:** the survey request timed out once; `/live/status` then answered with 17 events from the official page (checked in its own PR).
- **Acrobatics & Tumbling:** the 2026 spring season shown as current results, rankings in names (`#3 Quinnipiac`).
- **Equestrian:** results with recaps; rankings in names (`#10 UT Martin`).

## Setup (route parity)

The module starts as a pure move. Each of Baylor's 12 sponsored sports gets exactly the schedule and roster candidates production used before the module existed: the four inline routes (Cross Country, Soccer, Volleyball, Football) moved out of `src/index.js`, and the other sports' generic fallbacks are written out explicitly. A before/after dump of all 219 catalog school/sport routes (schedule, roster, combination flag) was identical. Each sport's routes are corrected in its own PR.

## Page data

baylorbears.com is a SIDEARM (Nuxt) site, like arizonawildcats.com. Each schedule page embeds every game in `__NUXT_DATA__` (read by the shared `sidearmScheduleGames`): `date` (the local start, `2026-10-03T21:30:00`; `T00:00:00` with `TBD`), `time` (`9:30 p.m.`, `7 p.m.`, `TBD`), `location_indicator` (`H`/`A`/`N`), `at_vs`, and `result` (`status`, both scores, `recap.url`). Baylor is in `America/Chicago`; local times are stored as the school's wall clock, as for every school.

## Football (`4.47.0-baylor-football`)

Production read the rendered cards with the shared SIDEARM parser: finals and recaps were right, but every upcoming game showed its date only. The module reader (`createBaylorHandlers().parseSchedule`, Football only via `pageDataSports`) gives:
- one event per game, rankings (`#21`, `No. 23`, `RV`) dropped;
- finals in K-State's wording (`W, 23-13`), date only, each with the game's own `/news/` recap (`football-recap-vs-colorado`), never the game-book PDF; a recap link must be dated from the game day to three days after;
- upcoming games with the published Baylor time (`Oct 3, 9:30 PM` at Arizona State, `Dec 4, 7:00 PM` Big 12 Championship), or the date alone for `TBD`.

The shared recap matcher matches each final to its own recap only (each names the sport and opponent); the expanded view writes highlights from that article.

**Live score.** ESPN's college football scoreboard through the shared FBS-group request (#164). The Sep 26 payload has two other "Bears" (Missouri State, Central Arkansas); only Colorado at Baylor matches, joined to the official card (`W, 23-13`, no second card).

`npm run test:baylor-module` (also in `npm test` and `npm run test:release`) checks route ownership and parity, the Football games from the unmodified fixture, recap matching across all four recaps, highlight generation from each game's own article and the ESPN match. Removing the parse hook fails it.

## Limitations

- The other 11 sports are still on the shared parsers (see the survey above); each is converted in its own PR.
- Athlete certification for Baylor has not been reviewed yet.
