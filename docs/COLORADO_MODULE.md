# Colorado school module

`src/schools/colorado.mjs` owns Colorado's cubuffs.com schedule and roster routes, its program combinations, its verified Instagram tags and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Colorado was chosen on October 4, 2026 (user: "Convert Colorado"). Sports are converted one per PR, each merged under `AGENTS.md` item 6 after the full gate and verified in production. cubuffs.com returns HTTP 403 to the development sandbox, so every official page used as a fixture came through the private source route (`scripts/fetch-official.mjs`), unmodified.

## Status

| Sport | PR | State |
| --- | --- | --- |
| Football | #214 | Page-data reader: 5 finals `W, 14-13` with their own recaps (the Oct 3 Texas Tech recap was linked after the fixture was taken; the preview shows it); 8 upcoming, `Nov 13, 8:15 PM` vs Houston and `Dec 4, 6:00 PM` Big 12 Championship Game, the rest date only (TBA); ESPN live score (shared FBS-group request) |
| Volleyball | #215 | 13 finals (`W, 3-0`) with their own recaps, 15 upcoming with published times; scrimmage and other teams' tournament matches left out; ESPN live score |
| Soccer | #216 | 13 finals (`T, 0-0`, `Utah (Exhibition)`) with their own recaps (Western Michigan's from the archive), 7 upcoming with published times; ESPN live score |
| Cross Country | #217 | Complete results from TFRRS: `Women's team: 1st · 15 pts / Men's team: 1st · 15 pts`, every Colorado finisher per race; a team without a score names its first finisher (`Women's: Ella Hagen 2nd`) |
| Basketball | #218 | Men's 34 + women's 31, labeled, the two official pages only; exhibitions `(Exhibition)`; published times; Big 12 Championship Mar 9-13 as one event; ESPN live scores for both teams |
| Golf | #219 | Both teams, labeled, one event per tournament (`13th of 20`, `1st of 18`) with its final story; a tournament under way is `In progress` |
| Skiing | #220 | Official page only; 2027 season (13 carnival events from 31 race days), all upcoming; in season the final place only on a carnival's last run (`2nd of 22`) |
| Tennis | (this PR) | Women's page only; fall tournaments one event each (`Colorado at Milwaukee Classic`) with the last day's story, listed only with a story; spring duals as games (`W, 4-2`) |
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

## Soccer (`4.52.3-colorado-soccer`)

Colorado sponsors women's soccer only. Production's games and results were right; it showed the Aug 5 exhibition as a plain `Colorado vs Utah` final. The module reads 20 games, one each: 13 finals in K-State's wording, date only (`T, 0-0` at Western Michigan), 12 with the recap the schedule links (the Aug 12 night game's recap is dated Aug 13) and the Western Michigan tie with its story from the archive (below); 7 upcoming with published times.

**Exhibitions (every Colorado sport).** A page-data entry of type `S` against another school reads `Utah (Exhibition)`, as K-State labels exhibitions (the volleyball Black and Gold scrimmage, also type `S`, stays out as internal).

**Published times (every Colorado sport).** The page shows the time text (`5:30 p.m.`); the page data's clock usually agrees, but at Kansas State (Oct 16) it holds 18:00. The text is what the page shows, so a clock in it wins (`Oct 16, 5:30 PM`, as production showed from the cards).

**Stories the schedule does not link (every Colorado game sport).** The Aug 27 tie at Western Michigan links no recap, and the shared search found none (`recap_not_found` on the first preview). Colorado's story is in the soccer archive, headlined "Buffs' First Road Match Ends In A Draw". A final with no linked story now takes one from `/sports/<sport>/archives` when it is dated on the game day or the day after, names the opponent in the article and states the result: the score either way round (never part of a record such as `3-0-1`), or for a tie, a draw. Feed and expanded view both run it (`isColoradoFinalWithoutStory`/`attachArchiveStory`); a story with another result or another opponent is refused.

**Live score.** ESPN's women's college soccer scoreboard (`soccer/usa.ncaa.w.1`); the Oct 2 payload's Colorado at UCF (`L, 0-2`) joins the official card.

## Cross Country (`4.52.4-colorado-cross-country`)

Colorado runs men's and women's teams on one schedule page. Production showed the cards' text as the headline (`M-1st/W-1st`, `M-3rd/W-NTS`), no race rows, and postseason meets as `Colorado vs Big 12 Championships`. The reader writes K-State's headline from the published places, women first, dates only, every meet `Colorado at ...`; a team with no score (`W-NTS`) gets no place.

TFRRS publishes every meet as plain tables, and Colorado's two TFRRS team pages list each meet with its date. The module (`findColoradoTfrrsMeet`, `parseColoradoTfrrsResults`, `attachMeetResults`; the same three school-gated hooks as Baylor and Cincinnati):
- finds the meet on each team's page by date and a shared distinctive word (`Roadrunners Invitational` is TFRRS's `2026 Roadrunners Invitational`);
- reads Colorado's team result and every Colorado finisher per race by the TEAM column (`Women's 6K`, `Men's 8K`); DNF and DNS rows are not results;
- treats a team listed with 0 points as no team result: TFRRS lists Colorado's women 5th at Wyoming with 0 points, the meet the card marks `W-NTS`. The headline then names the team's first finisher (`Women's: Ella Hagen 2nd / Men's team: 3rd · 57 pts`);
- refuses TFRRS when a team place the card publishes disagrees (the card's headline stays);
- keeps the source link on the official recap, with the TFRRS page beside it (`results_source_url`);
- writes highlights only from these rows.

Results: Roadrunners Invitational 17 rows (2 team, 6 women, 9 men), Wyoming Invitational 10 rows.

ESPN publishes no cross country scoreboard, so there is no live score (K-State has none).

## Basketball (`4.52.5-colorado-basketball`)

Production loaded the men's and women's pages plus the generic `/sports/basketball/` page and the homepage (65 upcoming; the extra pages added nothing today). Basketball now routes to the two official pages only, both labeled, with `-mens`/`-womens` event ids. The reader gives men's 34 and women's 31 games with published times (`Nov 24, 10:00 PM` vs Stanford; `TBA` shows the date only); the two fall exhibitions (type `S`) read `North Texas (Exhibition)` and `Adams State (Exhibition)`.

**Multi-day events (every Colorado sport).** The men's Big 12 Championship (Mar 9-13) ends on its last day, is today's event `In progress` while played, and counts from its last day for the past-without-result rule; a recap may be dated up to three days after the last day.

**Live scores.** ESPN's men's and women's college basketball scoreboards, labeled to match the official pages, through the shared Division I request. Tested on Feb 21, 2026: men's Oklahoma State at Colorado and women's Texas Tech at Colorado; Colorado State and Northern Colorado play in both payloads and are never taken for Colorado.

## Golf (`4.52.6-colorado-golf`)

Production loaded the first golf page that answered (women's) and showed one event per round, named after the round (`Colorado vs Second Round`, a day-one `10th/15` as a result), with nothing for the men. Golf now loads both teams' official pages only, labeled, with `-mens`/`-womens` event ids, and:
- merges a tournament's round entries (the same tournament name, at most two days apart) into one event named after the tournament, from its first to its last day: women's 40 entries become 14 tournaments, men's 38 become 13; every tournament reads `Colorado at ...`;
- takes the final result from the last round only: its place and field (`13th/20`, `T-1st/18`) read `13th of 20`; the schedule publishes no team total, so none is claimed. A finished tournament whose last round has no place reads `Completed`, never a day-one standing;
- links the last round's story, the tournament's final story (`Buffs Finish 13th At Red Sky`); the matcher accepts that bound story even when it names the event differently (`Red Sky` for the `Golfweek Red Sky Challenge`), checked against the last day; all six finals match only their own story;
- shows a tournament under way as today's event, `In progress`, with no result (the women's Ron Moore Intercollegiate, Oct 2-4, with only the day-one story).

ESPN publishes no college golf scoreboard, so there is no live score (K-State has none).

## Skiing (`4.52.7-colorado-skiing`)

Production loaded the schedule page and the homepage and showed last season's race days as current results, one event per race (`Colorado vs 20K Freestyle (M) at Soldier Hollow`, `2nd/22 Mar 14 Final vs Skiing ...`), and 2027 race days as upcoming events. Skiing now routes to the official page only. The page publishes the 2027 season (31 race days, no results yet).

The page lists one entry per race day with its carnival beside it, and the place published with each day is the team's standing after it: on the 2026 page the Denver Invitational reads `1st/8` after its alpine days (Jan 12-14, "Ski Buffs Stampede Into Lead at DU Invitational") and `1st/9` after its nordic days (Feb 7-8, "Baangman's Win Propels Buffs to DU Invitational Title"). The reader:
- makes one event per run of race days (at most seven days apart), named after its carnival, from its first to its last day: 2027's 31 race days become 13 events;
- names a carnival held in two runs by discipline (`Denver Invitational (Alpine)`, `Denver Invitational (Nordic)`; slalom and giant slalom are alpine);
- gives the final place only to a carnival's last run (`1st of 9`; NCAA Championships `2nd of 22`); an earlier run reads `Completed` with the published standing labeled `Team standing after these races`; a qualifier without team scoring (`NTS`) reads `Completed`;
- links each event's last-day story; leaves out the next-event widget's copy of a race (type `upcoming`).

The 2026 page is kept as a fixture to test the season in K-State's format (13 finals with stories).

ESPN publishes no skiing scoreboard, so there is no live score (K-State has no skiing).

## Tennis (`4.52.8-colorado-tennis`)

Colorado sponsors women's tennis only; `/sports/mens-tennis/schedule` renders SIDEARM's empty `@season @sport` template. Production loaded the women's page and showed one event per tournament day (`Colorado vs Day 3`, `NTS`). Tennis (schedule and roster) now routes to the women's page only. The reader:
- merges each fall tournament's day entries into one event, `Colorado at Milwaukee Classic`, from its first to its last day, with the last day's story (`Buffs Defeat Wisconsin to Conclude Milwaukee Tennis Classic`), never a day-one story; as K-State's, a past tournament (no team result, `NTS`) is listed only with Colorado's story; the Battle in the Bay Classic (Oct 1-4) is `In progress`;
- keeps spring duals as games with home and away (`Colorado vs Portland State`, `Colorado at UNLV`); on the 2025-26 page (fixture) they read `W, 4-2` with their own stories (23 decided duals);
- names a tournament played in separate stretches by its first round: `NCAA Team Championships (First & Second Rounds)`, `(Super Regionals)`, `(Round of 16)`; leaves out `TBD`.

On the 2025-26 page, the Mar 6 Kansas State dual links a story headlined "Buffs Fall to Jayhawks"; the matcher needs the opponent in the linked story, so that expanded view would say no recap was found rather than show the wrong match.

ESPN publishes no college tennis scoreboard, so there is no live score (K-State has none).

## Limitations

- None for Football.
