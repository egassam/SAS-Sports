# UTEP school module

`src/schools/utep.mjs` reads utepminers.com (SIDEARM via the private source), set up by `start-schools` on October 22, 2026 for the Mountain West (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Basketball, Cross Country, Football, Golf, Rifle, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Rifle is `/sports/womens-rifle`; a dual's score is written alone ("4661-3576" reads "W, 4661-3576") and a dual reads "vs"/"at" its opponent.
- Cross country meets are named by the page's tournament title ("Chile Pepper Festival", "Art Morgan Classic", "Arturo Barrios Invitational"); the page names their hosts.
- Women's tennis has only a 2024-25 page and the menu does not link it: not in the app.
- Track & Field and Softball fill when published.
- Shared Mountain West rules (`tests/mountain-west-shared.mjs`): a swimming dual's written W or L decides when the winner's score comes first; golf card places with the score to par in brackets; the earliest headline-named archive story from a meet's last day on; the Mountain West sponsors no gymnastics, wrestling, beach volleyball, rifle, skiing or water polo (no conference record in those unless the module names the league).

Each rule has a check in `tests/utep-module.mjs` (generated page blocks plus hand checks) or `tests/mountain-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; profile cards in Basketball. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Spring and unpublished seasons fill when published.
- First live cards not yet observed.
