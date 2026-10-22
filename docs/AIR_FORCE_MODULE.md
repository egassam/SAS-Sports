# Air Force school module

`src/schools/air-force.mjs` reads goairforcefalcons.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the Mountain West (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (17): Baseball, Basketball, Cross Country, Fencing, Football, Golf, Gymnastics, Hockey, Lacrosse, Rifle, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo, Wrestling.

## Rules

- Hockey plays in Atlantic Hockey America: regular-season games against members (Army, Bentley, Canisius, Holy Cross, Mercyhurst, Niagara, RIT, Robert Morris, Sacred Heart, American International) are league games; the page data names no league.
- Wrestling is a Pac-12 sport (from 2026-27; it was Big 12 until Oct 22 in this module) and lacrosse an ASUN sport here; the page data marks their league games.
- Rifle and fencing meets take their archive stories (USA Fencing NACs and the Regional Open Circuit publish no team result; the two Ole Miss rifle days each take their own day's story). Rifle reads as a meet ("at"), as West Virginia's does.
- Baseball, Gymnastics (both teams), Lacrosse and Track & Field fill when 2027 is published (the pages are 2026).
- Shared Mountain West rules (`tests/mountain-west-shared.mjs`): a swimming dual's written W or L decides when the winner's score comes first; golf card places with the score to par in brackets; the earliest headline-named archive story from a meet's last day on; the Mountain West sponsors no gymnastics, wrestling, beach volleyball, rifle, skiing or water polo (no conference record in those unless the module names the league).

Each rule has a check in `tests/air-force-module.mjs` (generated page blocks plus hand checks) or `tests/mountain-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; the athlete profiles publish no Instagram (850 profile pages read): profile cards in all 17 sports. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Spring and unpublished seasons fill when published.
- First live cards not yet observed.
