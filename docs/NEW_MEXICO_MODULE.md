# New Mexico school module

`src/schools/new-mexico.mjs` reads golobos.com (WMT, shared JSON-API kit), set up by `start-schools` on October 22, 2026 for the Mountain West (written by `scripts/port-wmt-api.mjs`). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Teams by the site's codes (`mgolf`/`wgolf`, `mbball`/`wbball`, `mten`/`wten`) labeled Men's/Women's; Mountain time.
- The NB3 Matchplay reads "Match play: 1-2" (men) and "0-2-1" (women); the Lobo XC Invite's "Individuals Only" reads "No team score (individuals only)".
- Beach Volleyball, Men's Soccer and Skiing are still listed by the site but their last seasons are 2018-19: not in the app.
- Track & Field fills when 2026-27 is published.
- Shared Mountain West rules (`tests/mountain-west-shared.mjs`): a swimming dual's written W or L decides when the winner's score comes first; golf card places with the score to par in brackets; the earliest headline-named archive story from a meet's last day on; the Mountain West sponsors no gymnastics, wrestling, beach volleyball, rifle, skiing or water polo (no conference record in those unless the module names the league).

Each rule has a check in `tests/new-mexico-module.mjs` (generated page blocks plus hand checks) or `tests/mountain-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; profile cards in Basketball, Cross Country, Golf, Soccer, Tennis, Track & Field. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Spring and unpublished seasons fill when published.
- First live cards not yet observed.
