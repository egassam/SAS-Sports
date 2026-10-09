# Minnesota school module

`src/schools/minnesota.mjs` owns Minnesota's gophersports.com routes, program combinations, verified Instagram pins and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Minnesota was added to the app on October 9, 2026, with Northwestern. All 15 sports were built and tested one at a time and published in one PR (#280). The site is SIDEARM (Nuxt page data), read through the private source. The module starts from Oklahoma's handlers (`scripts/start-schools.mjs`), with Michigan's per-team cross country.

## Status (`4.74.2-minnesota-northwestern`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories (4-1); ESPN live score |
| Volleyball | `womens-volleyball` | 12 finals with stories; ESPN live score |
| Soccer | `womens-soccer` | 13 finals with stories; ESPN live score |
| Hockey | `mens-ice-hockey`, `womens-ice-hockey` | Labeled; men's 2 finals, women's 2 finals + an exhibition; live scores (shared default) |
| Cross Country | `womens-cross-country`, `mens-cross-country` | Labeled, per-team TFRRS (`MN_college_f/m_Minnesota`): Cyclone Preview W 1st / M 1st, Roy Griak W 1st / M 4th, Loyola Lakefront W 2nd / M 3rd |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the cards (women 12th, 9th, 9th; men T15th, T11th, T7th) |
| Tennis | `womens-tennis` | ITA All-American, Gopher Invitational and Husker Invitational with stories (one story covers the last two) |
| Rowing | `womens-rowing` | Head of the Mississippi (Oct 3) "Completed" with its story |
| Swimming & Diving | `womens-`/`mens-swimming-and-diving` | Labeled; 2026-27 meets upcoming |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions from Oct 15 |
| Baseball, Softball | `baseball`, `softball` | Fall exhibitions; past ones publish no score (not listed) |
| Wrestling | `wrestling` | 2026-27 duals upcoming |
| Gymnastics, Track & Field | `womens-gymnastics`, `womens-`/`mens-track-and-field` | Pages still show the 2025-26 season: valid empty schedules until 2026-27 is published |

## Minnesota rules (beyond Oklahoma's)

- **Routes:** cross country and track are one page per team; the scaffold's `cross-country` was the homepage and `track-field` an empty template. Minnesota has no men's tennis or men's soccer (template pages only). Basketball, Cross Country, Golf, Hockey, Swimming & Diving and Track & Field are combined and labeled.
- **Cross country:** each team's event keeps its own TFRRS race (Illinois's split). TFRRS lists host Minnesota 16th at the Roy Griak Invitational with the lowest scores (26, 125): the shared reader now places a team by its score when a table is out of score order (`src/tfrrs-results.mjs`); the story confirms women 1st, men 4th.
- **Poll marks:** "(Receiving Votes) Wisconsin" (soccer, Oct 18) reads "Wisconsin".
- **Rowing:** a race without a score that is not an exhibition is a regatta (a meet, final with its story); "at Wisconsin (Exhibition)" stays a dual.

Every rule was mutated, and every mutation fails `npm run test:minnesota-module`.

## Athletes

Three per sport (`scripts/athlete-evidence.mjs`, Oct 9). **Pins:** Baseball (2 of 35 profiles), Golf (1 of 17), Gymnastics (12 of 18), Hockey (17 of 52: the first preview showed a men's player without a link), Softball (4 of 25). **Profile cards** (`athlete_profile_fallback_sports`): Baseball and Golf fill their remaining slots; Rowing (67 profiles), Swimming & Diving (58) and Tennis (9) publish no athlete Instagram link on any roster card or profile page; Instagram itself cannot be read without a login (project rule).

## Limitations

- **Women's hockey conference (fixed Oct 9, 4.75.1):** the record read "Big Ten 2-0"; the Big Ten sponsors only men's hockey. Women's league games are named WCHA.

- **Waiting on publication:** Gymnastics and Track & Field fill when gophersports.com publishes 2026-27.
- **Live cards:** no live card observed yet (volleyball at Rutgers, women's hockey vs Maine, Oct 9).
