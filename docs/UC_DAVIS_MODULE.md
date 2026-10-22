# UC Davis school module

`src/schools/uc-davis.mjs` reads ucdavisaggies.com (SIDEARM via the private source), set up by `start-schools` on October 22, 2026 for the Mountain West (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (17): Baseball, Basketball, Beach Volleyball, Cross Country, Field Hockey, Football, Golf, Gymnastics, Lacrosse, STUNT, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo.

## Rules

- Football plays in the Big Sky (Mountain West non-football member from July 1, 2026); water polo, beach volleyball, field hockey and lacrosse are affiliates elsewhere.
- Tournament names lose a "(Host: ...)" suffix ("NorCal Shootout"); women's basketball's "Mountain West Championships", listed at home, reads "at".
- Swimming from its current `swimming-and-diving` page (women's team).
- Baseball, Beach Volleyball, STUNT, Track & Field fill when published; Beach Volleyball and STUNT rosters list no players yet (off the athlete list until they do).
- Shared Mountain West rules (`tests/mountain-west-shared.mjs`): a swimming dual's written W or L decides when the winner's score comes first; golf card places with the score to par in brackets; the earliest headline-named archive story from a meet's last day on; the Mountain West sponsors no gymnastics, wrestling, beach volleyball, rifle, skiing or water polo (no conference record in those unless the module names the league).

Each rule has a check in `tests/uc-davis-module.mjs` (generated page blocks plus hand checks) or `tests/mountain-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; the profiles publish no Instagram (598 profile pages read): profile cards in every sport with a roster. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Spring and unpublished seasons fill when published.
- First live cards not yet observed.
