# San José State school module

`src/schools/san-jose-state.mjs` reads sjsuspartans.com (WMT, shared JSON-API kit), set up by `start-schools` on October 22, 2026 for the Mountain West (written by `scripts/port-wmt-api.mjs`). The event/result contract, caching, display and generic parsing stay shared.

Sports (14): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Gymnastics, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo.

## Rules

- Golf "6th out of 17 teams" reads "6th of 17"; the Pan-Pacific Golf Super League's "4th/2nd among American Universities" reads "4th (2nd among American Universities)".
- Track meets are never duals ("at Cal Opener").
- Gymnastics, Beach Volleyball, women's Water Polo fill in spring.
- Shared Mountain West rules (`tests/mountain-west-shared.mjs`): a swimming dual's written W or L decides when the winner's score comes first; golf card places with the score to par in brackets; the earliest headline-named archive story from a meet's last day on; the Mountain West sponsors no gymnastics, wrestling, beach volleyball, rifle, skiing or water polo (no conference record in those unless the module names the league).

Each rule has a check in `tests/san-jose-state-module.mjs` (generated page blocks plus hand checks) or `tests/mountain-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`san-jose-state-university`); profile cards in Beach Volleyball, Cross Country, Gymnastics, Softball, Volleyball on the first preview (marketplace lookups fill as caches warm). See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Spring and unpublished seasons fill when published.
- First live cards not yet observed.
