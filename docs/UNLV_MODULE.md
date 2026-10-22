# UNLV school module

`src/schools/unlv.mjs` reads unlvrebels.com (SIDEARM via the private source), set up by `start-schools` on October 22, 2026 for the Mountain West (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Swimming from its one page for both teams (`swimming-and-diving`, "Women: L, 231-68 | Men: L, 245-55" reads "L, 68-231" / "L, 55-245"); the `womens-swimming-and-diving` page is 2021-22.
- Baseball and Track & Field fill when published.
- Shared Mountain West rules (`tests/mountain-west-shared.mjs`): a swimming dual's written W or L decides when the winner's score comes first; golf card places with the score to par in brackets; the earliest headline-named archive story from a meet's last day on; the Mountain West sponsors no gymnastics, wrestling, beach volleyball, rifle, skiing or water polo (no conference record in those unless the module names the league).

Each rule has a check in `tests/unlv-module.mjs` (generated page blocks plus hand checks) or `tests/mountain-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; profile cards in Cross Country, Golf, Tennis, Track & Field. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Spring and unpublished seasons fill when published.
- First live cards not yet observed.
