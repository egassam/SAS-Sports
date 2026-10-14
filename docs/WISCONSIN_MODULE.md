# Wisconsin school module

`src/schools/wisconsin.mjs` owns Wisconsin's uwbadgers.com routes, program combinations, verified Instagram pins and its schedule reader (SIDEARM page data, Oklahoma's handlers). uwbadgers.com is read through the Worker's private source. The event/result contract, caching, display and generic parsing stay shared.

Wisconsin was added to the app on October 14, 2026 (13 sports, one PR with Washington).

## Status (`4.85.1-washington-wisconsin`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 4-1 (Big Ten 2-0) as published |
| Volleyball | `womens-volleyball` | 17 finals with stories (one exhibition); 11-5 (5-1) as published; the Alumni Match is out |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; 7-4-3 (3-3-2) and 7-2-3 (1-2-3) as published |
| Hockey | `mens-ice-hockey`, `womens-ice-hockey` | Labeled; men's 4-0, women's 4-2 (WCHA 0-2) as published |
| Cross Country | `womens-`, `mens-cross-country` | Labeled; each team's TFRRS page (Illinois's split): Badger Classic W 1st / M 1st, McNichols W 16th / M 9th, Lakefront W 15th / M 8th, Nuttycombe W 33rd / M 9th |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the cards; the Bush Cup is match play (4-4 with Army) |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; women's tournaments with stories; men's three past tournaments have no story of their own (not listed) |
| Rowing | `womens-rowing`, `rowing` (lightweight) | Labeled Women's and Lightweight; regattas with their stories |
| Swimming & Diving, Basketball, Wrestling | | 2026-27 schedules upcoming |
| Softball | `softball` | Fall exhibitions (Sep 11-Oct 7) all past without published results: a valid empty schedule (shared SIDEARM reader fix: such a page read as a failed source) |
| Track & Field | | Pages still show 2025-26: valid empty schedules until published |

## Wisconsin rules (beyond Oklahoma's handlers)

- **Routes:** cross country and track are `womens-`/`mens-` pages; `/sports/cross-country/` is SIDEARM's empty template.
- **Combined:** Basketball, Cross Country, Golf, Hockey, Rowing, Soccer, Swimming & Diving, Tennis, Track & Field; `/sports/rowing/` is labeled Lightweight (`teamLabels`).
- **Rowing regattas are meets** (Minnesota's rule).
- **Women's hockey in the WCHA** (`conference_name`).
- **Tennis archive stories must name their tournament in the address:** the Sep 23 "…-continues-fall-season-at-fighting-irish-mini-duals" story is not the men's ITA All-American Championships'.
- **Internal:** volleyball's "Alumni Match".

Every rule was mutated and each mutation fails `node tests/wisconsin-module.mjs`; two ported tennis-story tweaks no test needed were removed.

## Athletes

Three featured athletes per sport. Verified Instagram from profile pages for Cross Country (15 of 34), Football (76 of 113), Hockey (19 of 50), Rowing (31 of 89), Swimming & Diving (17 of 57), Track & Field (43 of 77); pinned: Basketball (7), Golf (3), Soccer (8), Softball (3), Tennis (7), Wrestling (3). **Profile cards:** Volleyball (36 profiles, 0 links).

## Open

- Softball fills when its spring games are published; Track & Field when 2026-27 is published.
- First live cards not yet observed.
