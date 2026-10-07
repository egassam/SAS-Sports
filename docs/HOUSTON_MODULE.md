# Houston school module

`src/schools/houston.mjs` owns Houston's uhcougars.com schedule and roster routes, its program combinations, its verified Instagram tags and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Houston was chosen on October 7, 2026 (user: "Start Houston. Complete it all then check how long it took and try to make it faster for the next school"). All 11 sports were converted and tested one at a time, then published together in one PR (batched publishing, `AGENTS.md` item 3). uhcougars.com returns HTTP 403 to the development sandbox, so every official page used as a fixture came through the private source route (`scripts/fetch-official.mjs`), unmodified.

Houston is the first school built from the shared SIDEARM kit (`src/sidearm-school-kit.mjs`, below): the module holds Houston's routes and about 20 lines of settings. It writes no reader, matcher, archive search or TFRRS code of its own.

## Status (`4.53.0-houston`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals (`W, 33-20`) with their own recaps; 7 upcoming with published Central times (`Oct 10, 2:30 PM` at Kansas State) or the date alone (TBA); ESPN live score (shared FBS-group request) |
| Volleyball | `womens-volleyball` | 15 finals (`W, 3-1`), 14 upcoming; the other teams' tournament matches (`Houston Christian vs Texas State`) and the exhibitions without a result left out; rankings dropped (`#3 Kentucky`, `rv Kansas State`); Kentucky's story (not linked by the schedule) from the archive; ESPN live score |
| Soccer | `womens-soccer` | 12 finals (`T, 0-0`) with their own recaps, 7 upcoming; the Aug 6 exhibition at Rice (no result) left out; ESPN live score |
| Cross Country | `cross-country` | Complete results from TFRRS: `Women's team: 2nd · 42 pts / Men's team: 2nd · 38 pts`, every Houston runner per race; meets read `Houston at ...` |
| Basketball | `mens-basketball`, `womens-basketball` | Men's 36 + women's 33, labeled; exhibitions `(Exhibition)`; bracket rounds without an opponent are one event per tournament (`Houston at Phillips 66 Big 12 Tournament`, Mar 9-13; `Houston at NCAA Tournament`, Mar 16-Apr 5); ESPN live scores for both teams |
| Golf | `mens-golf`, `womens-golf` | Both teams, labeled, one event per tournament with the last round's place and story (`10th of 12`; the day-one `t-10th of 12` is not the result); match play as published (`defeated New Mexico State, 3-2; lost to New Mexico, 3.5-1.5`); `No team score (individuals only)`; a tournament under way is `In progress` |
| Tennis | `womens-tennis` | Fall tournaments, one event each from first to last day; the ITA Texas Regional (Oct 7-12) `In progress`; a past tournament is listed only with Houston's story (K-State's rule) |
| Swimming & Diving | `womens-swimming-and-diving` | 2026-27, 11 meets, all upcoming; a meet's days are one event (Fresno State Oct 16-17, Phill Hansel Invitational Nov 17-20); the Nov 6 double dual stays two meets |
| Baseball | `baseball` | 2027 season, 36 games; fall games are exhibitions (`Houston vs ULM (Exhibition)`); the canceled Texas game left out; doubleheaders read `Game 1`/`Game 2`; ESPN live score |
| Softball | `softball` | Fall exhibitions (`Blinn College (Exhibition)`); the Red-Black Series is internal and left out; ESPN live score |
| Track & Field | `track-and-field` | Empty schedule (the page still shows 2026); in season one event per meet, team places with points (`Women's team: 14th · 20.5 pts / Men's team: 3rd · 87.33 pts`) |

## Routes

Production loaded several candidate pages per sport, including the homepage and generic pages (`/sports/basketball/`, `/sports/golf/`, `/sports/tennis/`, `/sports/track-field/`, the swimming variants). Each of those renders SIDEARM's empty `@season @sport` template (fixtures kept, checked by the test). Every sport now routes to its official page(s) only, for schedules and rosters. Houston sponsors women's tennis and women's swimming & diving only (`/sports/mens-tennis/` and `/sports/mens-swimming-and-diving/` are the empty template). Basketball and Golf combine the men's and women's pages, labeled; Swimming & Diving is no longer a combined sport.

**Schedule compaction removed.** The shared `compactScheduleHtml` cut uhcougars.com pages down to the cards, which drops the page data after them (Colorado had the same problem). Houston pages are now passed whole; no host is compacted (`COMPACTED_HOSTS` is empty). The test runs the whole download-and-parse pipeline (`fetchLive`), and adding the host back fails it.

## Settings that differ from the shared reader

- **Times:** the time text wins over the page data's clock, and `Noon`/`Noon CT` is 12:00 PM (`sidearmStartTimeText`).
- **Opponents:** rankings dropped (including lowercase `rv`); `A vs B` entries are other teams' matches; type `S` entries are exhibitions; scrimmages, intrasquads and the Red-Black Series are internal.
- **Recaps (`createRecapMatcher`, `trustOwnLink`):** a story the schedule links to the game is accepted when dated from the game's first day to the day after its last. The Sep 4 volleyball recap names Houston Christian only as "the Huskies", so the opponent-name check refused the game's own story. Any other candidate must still name the opponent in its headline. The Sep 3 volleyball story covers both matches that day and is shared by both.
- **Stories the schedule does not link (`createArchiveStory`):** a scored final takes its story from `/sports/<sport>/archives` when it is dated on the game day or the day after, names the opponent and states the score (Kentucky, Sep 13).
- **Track stories two meets share:** the schedule links the Wake Forest Invitational story to the Mt. SAC Relays too (Apr 15-16). A meet keeps a story another meet also links only when the story's address names it. The Penn Relays and Michael Johnson Invitational share a story that names both, and both keep it.
- **Cross country (`createTfrrsMeetResults`):** Houston's TFRRS team pages (`TX_college_f_Houston`, `TX_college_m_Houston`) list each meet. Results: Aggie Opener 22 rows (2 team, 13 women, 7 men), Texas A&M Invitational 20 rows. A place TFRRS contradicts is refused.

`npm run test:houston-module` (also in `npm test` and `npm run test:release`) covers all 11 sports from the unmodified fixtures. Each final matches only its own recap (36 stories). It also covers the archive story, TFRRS, ESPN payloads for football, volleyball and soccer (Houston Christian and Sam Houston are never taken for Houston), doubleheaders and the last-season track page. Each of the 15 rules above was mutated and every mutation fails the test.

## Limitations

Not fixable from the official sources today:
- **Track & Field 2026-27 schedule unpublished.** The page title is "2026 Track and Field Schedule" and every meet is before July 1, 2026. The app shows the empty-schedule note; the season fills in when the page is updated (in-season format tested on the 2026 page).
- **Tennis: the Rice Invite (Sep 25-27)** has no Houston story in the tennis archive (fixture `womens-tennis-archives.html.gz`), so under K-State's rule it is not listed.
- **No finals yet** for Basketball, Swimming & Diving, Baseball and Softball (seasons start Oct 15 onward; softball's past fall exhibitions published no score). Swimming dual-meet scores are read as games (`W, 150-110`, half points allowed); an invitational's published place is shown as published. Neither form has been seen on this page yet.
- **Golf team totals:** the schedule publishes only the place and field size (`10th of 12`), so no team total is claimed (as for Colorado).
- **Live scores** are tested on real ESPN payloads; no Houston game has been observed live under the module yet.
