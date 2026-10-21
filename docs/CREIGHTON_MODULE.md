# Creighton school module

`src/schools/creighton.mjs` reads gocreighton.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from NC State's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Creighton was added to the app on October 21, 2026 in the Big East (9 sports: Baseball, Basketball, Cross Country, Golf, Rowing, Soccer, Softball, Tennis, Volleyball). gocreighton.com is read through the private source (Imperva answers the sandbox with 403).

## Rules

- Cross country: men's and women's pages each read their own TFRRS team page and keep their own race (shared `createTeamTfrrsMeetResults`, Florida State's split made shared).
- Rowing vs Kansas State (Sep 26) reads "W, 1-1": the page publishes "1 vs 1" with a win (the Varsity 8, per the story).
- Basketball bracket games named by round or "vs. TBD" read as their tournament ("at Players Era 16", "at BIG EAST Tournament Final"); volleyball's "BIG EAST Tournament (Semifinals)" is "at".
- Shared Big East rules (every module): bracket games named by round or "vs. TBD" read as their tournament and "at"; a multi-day event naming its host and its tournament reads as the tournament; a past swimming meet with no result line, story or TFRRS is not listed.

Each rule has a check in `tests/creighton-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

Every sport shows three athletes on the preview. No NIL marketplace linked. Profile cards fill the remaining slots in Baseball, Rowing, Softball, Tennis (the roster cards and profile pages publish fewer than three athlete Instagram accounts; `athlete_profile_fallback_sports`).

## Open

- Softball and Baseball fill when 2027 is published.
- First live cards not yet observed.
