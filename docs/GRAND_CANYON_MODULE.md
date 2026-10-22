# Grand Canyon school module

`src/schools/grand-canyon.mjs` reads gculopes.com (SIDEARM via the private source), set up by `start-schools` on October 22, 2026 for the Mountain West (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Beach Volleyball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Cross country is one page for both teams (`mens-cross-country`, "M: 4th of 5 | W: 2nd of 5"); the `womens-cross-country` page is the 2016 season.
- Golf story pattern names "Lopes" and "Antelopes".
- Track & Field fills when 2026-27 is published (2025-26 page); Beach Volleyball and Softball in spring.
- Shared Mountain West rules (`tests/mountain-west-shared.mjs`): a swimming dual's written W or L decides when the winner's score comes first; golf card places with the score to par in brackets; the earliest headline-named archive story from a meet's last day on; the Mountain West sponsors no gymnastics, wrestling, beach volleyball, rifle, skiing or water polo (no conference record in those unless the module names the league).

Each rule has a check in `tests/grand-canyon-module.mjs` (generated page blocks plus hand checks) or `tests/mountain-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Opendorse (`grandcanyon-lopes`): three Instagram athletes in every sport on the preview. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Spring and unpublished seasons fill when published.
- First live cards not yet observed.
