# Arizona State school module

`src/schools/arizona-state.mjs` owns Arizona State's thesundevils.com schedule and roster routes and its program combinations. The Worker imports its configuration; the event/result contract, caching, display and generic SIDEARM parsing remain shared.

Arizona State was chosen as the next Big 12 school on October 1, 2026 (user: "Start next school. Stay in the Big 12."). It was the first unconverted Big 12 school in catalog order whose official site the development sandbox can download: arizonawildcats.com, baylorbears.com, cubuffs.com, uhcougars.com, cyclones.com, gofrogs.com, texastech.com and wvusports.com all returned HTTP 403, as utahutes.com did through most of the Utah work.

## Status (production `4.33.3-arizona-state-swimming-diving`, October 1, ~02:35 UTC)

All 17 sponsored sports read thesundevils.com's official cards through the module (`cardSports`); every route is an official sport page. Forced production feeds all returned 200, with no placeholder opponents or `Mon, YYYY, D` dates.

| Sport | PR | Production |
| --- | --- | --- |
| Football | #66 | 3 finals `W, 24-17`-style with recaps, 10 upcoming with published times |
| Soccer | #68 | 11 finals with recaps, 9 upcoming |
| Volleyball | #69 | 13 finals with recaps, 16 upcoming |
| Baseball | #70 | Fall exhibition `W, 10-0`; 34 upcoming (fall 2026 + spring 2027) |
| Softball | #71 | 7 fall games |
| Basketball | #72 | Men's 34 + women's 33, labeled |
| Hockey | #73 | 36 games (`ice-hockey`) |
| Wrestling | #74 | 2 events |
| Beach Volleyball, Lacrosse, Water Polo, Gymnastics, Track & Field | #75–#79 | Empty schedule (pages show only the past season) |
| Cross Country | #80 | Dave Murray: `Women's 4K` 12 + `Men's 6K` 6 runners from the official recap; Meadows Challenge: no published results, says so |
| Golf | #81 | Both teams; `1st (800)`, `T6th (896)`, `T2nd (851)` |
| Tennis | #82 | Both teams; men's page is 2025-26 (empty); women's 12 fall tournaments |
| Swimming & Diving | #83 | Was 502; both teams (16 + 17) |

**Limitations:**
- Golf placings lack the field size (`of 12`), which the cards do not publish.
- The USTA SoCal tennis recap (an individual-titles story) is not accepted by the shared recap matcher, so its expanded view says no exact recap matched.
- Individual tennis tournaments publish no team result (`Completed`).
- Neutral-site cards between two other teams (women's basketball, Nov 28–29) are skipped.

## Setup (route parity)

The module starts as a pure move. Each of Arizona State's 17 sponsored sports gets exactly the schedule and roster candidates production used before the module existed:
- the five inline schedule routes (Volleyball, Soccer, Cross Country, Football, Swimming & Diving) moved out of `src/index.js`;
- the other sports' generic fallbacks and all roster fallbacks are now written out explicitly.

`combinedSports` keeps the shared policy (Basketball, Swimming & Diving).

A before/after dump of all 219 catalog school/sport schedule and roster routes (plus combination flags) was identical. `VERSION` was not bumped, since output is unchanged.

`npm run test:arizona-state-module` (also in `npm test` and `npm run test:release`) checks:
- all 17 sports route to thesundevils.com through the module;
- no `'arizona-state|` configuration remains in `src/index.js`;
- the program combinations are unchanged.

## Football (production `4.32.0-arizona-state-football`, PR #66, October 1)

thesundevils.com renders each event as a `schedule-event-item` card; its `__NUXT_DATA__` carries no game objects. The shared WMT card reader read the nested `vs.`/`at` divider as the opponent and split `<time>Sep</time><time>5</time>` into date `Sep` and time `5`. Every home card therefore became `ASU vs vs.` with no date and they merged into one event (likewise `ASU at at`); Schema.org data supplied the upcoming games, at UTC midnight, so 7:30 p.m. games showed a day late (Baylor `Oct 4` instead of Oct 3). The Sep 19 game at Kansas (London) was missing, and a phantom `Big 12 Championship` result reused the Sep 5 score and recap.

`createArizonaStateHandlers().parseSchedule` reads the cards itself for the sports in `arizonaStateSchool.cardSports` (Football only, for now):
- each card is cut at its matching `</div>`, so the last card cannot run into the table view below;
- opponent from the name with the divider removed and rankings (`#10/#9`) dropped; relation from the divider;
- `W Win 70-7` becomes K-State's `W, 70-7` with one Result row; the card's own Recap link (thesundevils.com `/news/`) becomes `recap_url`;
- finals show the date only, as K-State does; upcoming games show the published time (`Oct 3, 7:30 PM`), stored as Arizona wall clock; `TBA` shows the date only;
- the season year comes from the page heading (`2026 Football Schedule`).

A page without cards returns `null`, so the shared parsers still run. Fixture: `tests/fixtures/arizona-state-module/football-schedule.html.gz` (unmodified; see `sources.json`). Expected: 3 finals (`W, 70-7` Morgan State, `L, 20-48` at Texas A&M, `W, 24-17` at Kansas) with their recaps, 10 upcoming.

## Soccer (`4.32.1-arizona-state-soccer`)

Production showed 3 results with `vs.`/`at` placeholder opponents (`ASU at at`, `W, 3-1`) and a phantom Nov 9 Big 12 Tournament final. Soccer joins `cardSports`. The reader also gains three parts every card sport uses:
- **Years from JSON-LD.** Cards show only month and day; the page's JSON-LD lists every event's start time (UTC; Arizona is UTC-7 all year). A card's year is the one year in the current academic season with a published event that day; otherwise the page heading decides, as before.
- **Current season only.** Events outside the current academic year (July–June) are dropped, as for Utah.
- **Empty schedule.** A page whose events are all from a past season returns `[]`, flagged as an empty schedule (200 `[]`, with the app's note) rather than a failed source. A page whose cards cannot be read still falls back to the shared parsers.

Football's output is byte-identical. Soccer: 11 finals (`W, 3-1` at New Mexico St. … `W, 2-0` at Kansas St.) with their recaps, 9 upcoming with published times; `#RV` rankings are dropped like `#9`.

## Volleyball (`4.32.2-arizona-state-volleyball`)

Production showed 2 results (`ASU vs vs.`, `ASU at at`), the same card defect. Volleyball joins `cardSports`: 13 finals (`W, 3-1` vs Texas … `W, 3-1` at Cincinnati) with their recaps, 16 upcoming with published times.

## Baseball (`4.32.3-arizona-state-baseball`)

Production showed one result dated `Sep, 2027, 27` titled `ASU vs vs.`: the page is titled "2027 Baseball Schedule" but opens with fall 2026 exhibitions, and the card defect hid the opponent. Baseball joins `cardSports`: the Sep 27, 2026 exhibition `W, 10-0` vs Naranjeros de Hermosillo (no recap is linked), 4 fall exhibitions with times and 30 spring 2027 games (times TBA).

## Softball (`4.32.4-arizona-state-softball`)

Production showed 9 upcoming games, with evening games on the next UTC day duplicating the card dates. Softball joins `cardSports`: the 7 fall 2026 games, each on its published day and time.

## Basketball (`4.32.5-arizona-state-basketball`)

Production showed men's games a day late (New Mexico `Oct 26` instead of Oct 25). Basketball joins `cardSports`, and its routes are now only the two official pages (`mens-basketball`, `womens-basketball`); the generic `basketball` and homepage fallbacks are removed. Men's: 34 games; women's: 33 games with published times. Two women's cards are neutral-site games between other teams (Wake Forest vs Quinnipiac) and are skipped.

## Hockey (`4.32.6-arizona-state-hockey`)

Production showed 35 games, with evening games on the next UTC day (Lindenwood `Oct 3` for the Oct 2, 5:00 p.m. game, merging the two games of the series). Hockey joins `cardSports`, and its route is now only the official `ice-hockey` page (the `mens-ice-hockey`, `womens-ice-hockey`, `hockey` and homepage candidates are removed). All 36 games show on their published day and time.

## Wrestling (`4.32.7-arizona-state-wrestling`)

Production showed the Oklahoma State dual on `November 21` (UTC) instead of Nov 20, 6:00 p.m. Wrestling joins `cardSports`; its route is now only the official page (homepage fallback removed). Two events: Oklahoma St. (Nov 20, 6:00 PM) and the National Duals Invitational (Dec 12, all day).

## Beach Volleyball (`4.32.8-arizona-state-beach-volleyball`)

Production showed spring 2026 matches as current results (`ASU at at`, `W, 5-0`). Beach Volleyball joins `cardSports`, and its route is only the official page. The page still shows the spring 2026 season, so the feed is an empty schedule (200 `[]` with the app's note) until the 2027 schedule is published.

Fix to the season filter: it kept January–June events of the season's *first* year (Feb 2026 in the 2026–27 season). January–June now belong to the season's second year only. Output for the nine sports already merged is byte-identical.

## Lacrosse (`4.32.9-arizona-state-lacrosse`)

Production showed spring 2026 games as current results (`ASU at at`, `L, 11-12`). Lacrosse joins `cardSports`, and its route is only the official `lacrosse` page. The page still shows the spring 2026 season (18 cards), so the feed is an empty schedule (200 `[]` with the app's note) until the next season is published.

## Water Polo (`4.32.10-arizona-state-water-polo`)

Production showed spring 2026 matches as current results (`ASU vs vs.`, `W, 16-7`). Water Polo joins `cardSports`, and its route is only the official `water-polo` page. The page still shows the spring 2026 season (32 cards), so the feed is an empty schedule (200 `[]` with the app's note) until the next season is published.

## Gymnastics (`4.32.11-arizona-state-gymnastics`)

Production showed the 2026 season as current results (`ASU vs vs.`, `W Win 195.100-193.250`). Gymnastics joins `cardSports`, and its route is only the official `gymnastics` page. The page still shows the 2026 season (Jan 4 - Apr 2, 2026) (23 cards), so the feed is an empty schedule (200 `[]` with the app's note) until the next season is published.

## Track & Field (`4.32.12-arizona-state-track-field`)

Production showed 15 meets of the 2025-26 season as current results (`Completed`). Track & Field joins `cardSports`, and its route is only the official `track-field` page. The page still shows the 2025-26 season (Jan 9 - Jun 10, 2026) (15 cards), so the feed is an empty schedule (200 `[]` with the app's note) until the next season is published.

## Cross Country (`4.33.0-arizona-state-cross-country`)

Production showed one meet, `ASU at at` / `Completed`, with no race rows. Cross Country joins `cardSports`, and `attachMeetResults` (school-gated hooks in the feed, `attachOfficialMeetResults` and the expanded view, as for Utah) reads the meet's own official recap:
- **Dave Murray Invitational (Sep 4):** `Women's 4K` (12 runners, Kelli Gaffney 1st · 13:47.3) then `Men's 6K` (6 runners); 18 rows; highlights name each race's leader. The recap gives no team scores, so the headline stays `Completed`. Times are kept as published (`19.22.9` for Ryan Lish is the recap's own typo).
- **Meadows Challenge (Sep 26):** the card links no recap or results (its "Live Results" link is the preview article), so the meet shows `Completed` with "No official recap or results are published for this meet on thesundevils.com." Nothing is invented.
- 4 upcoming meets.

## Golf (`4.33.1-arizona-state-golf`)

Production showed the women's page only (it was the first route candidate and Golf was not a combined sport), as `ASU vs Mason Rudolph Championship` / `Completed`. Golf is now a combined sport with only the two official pages (`mens-golf`, `womens-golf`), labeled by team, and joins `cardSports`:
- The card's team finish (`schedule-event-grid-result__text`: `1st, -40/800`, `T6th, +32/896`, `T2, -1 (851)`) becomes K-State's wording without the field size, which the card does not publish: `1st (800)`, `T6th (896)`, `T2nd (851)`. A completed tournament without one reads `Completed` (Ben Hogan Collegiate).
- Men's: 3 finals, 11 upcoming; women's: 1 final, 11 upcoming.
- Tournament and meet cards without a vs./at divider read `ASU at …`, as K-State's do (`MEET_SPORTS`: Golf, Cross Country, Track & Field, Gymnastics). Cross Country, Football and Wrestling output is unchanged.

## Tennis (`4.33.2-arizona-state-tennis`)

Production showed the women's page only (first route candidate), with a placeholder `ASU at at` result. Tennis is now a combined sport with only the two official pages (`mens-tennis`, `womens-tennis`), labeled by team, and joins `cardSports`:
- The men's page still shows the 2025-26 season (28 duals, Jan 11 - May 1, 2026), so it contributes nothing until the 2027 schedule is published.
- Women's: 12 fall 2026 individual tournaments; the 2 completed ones (ITA All-American, USTA SoCal) read `Completed`, since individual events publish no team result. The USTA SoCal card links its recap.

## Swimming & Diving (`4.33.3-arizona-state-swimming-diving`)

Production returned 502: the inherited routes (`/sports/mens/swimming-diving/`, `/sports/womens/swimming-diving/`) do not exist. The routes are now the official `mens-swimming-diving` and `womens-swimming-diving` pages (labeled by team), and the sport joins `cardSports`. Men's: 16 events, women's: 17 (women's also swim at Northern Arizona on Oct 9); the Sep 25 intrasquad scrimmage reads `Completed`.

## Baseline vs K-State (production `4.31.9`, October 1, forced refresh)

| Sport | Now | Gap vs K-State |
| --- | --- | --- |
| Football | 3 results, 10 upcoming | Titles read `ASU vs vs.`, dates `Sep, 2026, 5`; a phantom Dec 4 Big 12 Championship result `W, 70-7`; missing games |
| Soccer, Volleyball, Lacrosse, Beach Volleyball, Water Polo, Baseball | Results with `vs.`/`at` placeholder opponents and `Mon, YYYY, D` dates | Same card-parsing defect; past seasons shown (Baseball `Sep, 2027`) |
| Gymnastics, Track & Field, Water Polo, Lacrosse, Beach Volleyball | Spring 2026 results shown as current | Past season not filtered |
| Cross Country | 1 result `Completed` | No race groups or runners |
| Golf, Tennis | `Completed` | No placings; one team only |
| Swimming & Diving | 502 | Routes `/sports/mens/swimming-diving/` do not resolve |
| Basketball, Hockey, Softball, Wrestling | Upcoming only | Schedule and start-time check |

## October 8, 2026: cross country from TFRRS, internal events, athletes (`4.66.2-asu-cross-country`)

- **Cross Country** reads TFRRS first (`AZ_college_f_Arizona_State`, `AZ_college_m_Arizona_State`): both races and the team scores.
  - Dave Murray Invitational: `Women's team: 2nd · 29 pts / Men's team: 2nd · 62 pts`, 18 rows.
  - Meadows Challenge (TFRRS's "Princeton Meadows Classic", no official recap): `Women's team: 14th · 379 pts / Men's team: 12th · 340 pts`, 16 rows.
  - The meet's own recap stays the fallback.
  - This closes both cross country limitations.
  - `highlightRevision` 1, so stored expanded views are rebuilt.
- **Internal events** are not listed: the Sep 25 swimming Intrasquad Scrimmage, which production showed as a final for both teams, and beach volleyball's Maroon and Gold Scrimmage.
- **Athlete certification reviewed:** all 17 sports are listed in `tests/certified-schools.json`. Production showed three verified-Instagram athletes in each (`validate-schools --athletes-only`: 17/17, Oct 8).
- **Still open (source):** golf placings lack the field size, which the cards do not publish. The USTA SoCal tennis story is an individual-titles story that the shared matcher does not accept.
