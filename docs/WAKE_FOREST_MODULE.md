# Wake Forest school module

`src/schools/wake-forest.mjs` owns Wake Forest's godeacs.com routes, program combinations, verified Instagram pins and its SIDEARM schedule handlers (ported from NC State's with `start-schools --from=nc-state`). The event/result contract, caching, display and generic parsing stay shared.

Wake Forest was added to the app on October 15, 2026 (10 sports, one PR with Virginia Tech). godeacs.com is SIDEARM; the sandbox's direct reads get a 122-byte page, so onboarding read it through the private source route (the Worker reads it directly).

## Status (`4.94.0-virginia-tech-wake-forest`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | Finals with stories; at Purdue (Sep 12, W 38-36) has no story the schedule or the archive lists (the archive listing reaches back only to Sep 14) |
| Volleyball | `womens-volleyball` | Finals with stories |
| Soccer | `womens-soccer`, `mens-soccer` | Combined, labeled; women's at Cal (Sep 17) takes its archive story ("Demon Deacons Stay Perfect, Down Golden Bears", 3-1); women's page data marks every game `conference:false`, so ACC games are by membership (module `ACC_WOMENS_SOCCER`; men's keeps the page's flags) |
| Field Hockey | `field-hockey` | Finals with stories |
| Cross Country | `cross-country` | Team places; TFRRS `NC_college_*_Wake_Forest` |
| Golf | `womens-golf`, `mens-golf` | Combined; men's places from the cards; women's from the final stories (ANNIKA "Team Title" 1st; Stephens Cup "Finishes Runner-Up" 2nd) |
| Tennis | `womens-tennis`, `mens-tennis` | Combined; tournaments "Completed" with stories; players' pro events (ATP Challenger) not listed; men's ITA Carolina Regionals has no story (not listed) |
| Basketball | `mens-basketball`, `womens-basketball` | Men's exhibitions labeled |
| Baseball, Track & Field | `baseball`, `track-and-field` | Nothing published for 2026-27 yet (valid empty) |

## Rules

- Pro events: "ATP …", "WTA …" and "… Challenger …" join ITF/Futures/W15 (module).
- Golf story places (shared `golfStoryPlace`): a headline "<team> … Team Title" is 1st, "<team> … Runner-Up" is 2nd. Team names "Demon Deacons|Deacs|Wake Forest" (the port left NC State's "Pack").

Every new rule was mutated and each mutation fails `node tests/wake-forest-module.mjs`.

## Athletes

Pinned from the profile pages: Baseball (Austin Hawke, Luke Schmolke; 2 of 35 profiles), Golf (Macy Pate, Tom Haberer, Kyle Haas; 4 of 17), Tennis (Evie Oxford, Heidi Bulger, Aubrey Nisbet; 5 of 18). Profile cards (`athlete_profile_fallback_sports`): Baseball's third slot, Cross Country (41 profiles, none), Track & Field (66, none).

## Open

- Baseball and Track & Field fill when 2026-27 is published.
- First live cards not yet observed (women's soccer vs Florida State Oct 15; men's basketball exhibition vs South Carolina Oct 15).
