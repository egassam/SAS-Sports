# Providence school module

`src/schools/providence.mjs` reads friars.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from NC State's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Providence was added to the app on October 21, 2026 in the Big East (12 sports: Basketball, Cross Country, Field Hockey, Golf, Hockey, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball). friars.com is read directly.

## Rules

- Cross country: per-team pages and TFRRS (shared helper).
- Golf "T9 of 10" (no suffix) read by the shared `golfPlacing`.
- Hockey: both teams in Hockey East (`conference_name`); field hockey's "BIG EAST Championship" is "at".
- Storyless tennis tournaments and the Friar Invitational swim meet (no score, story or result) are not listed; Swimming & Diving is one page for both teams.
- Shared Big East rules (every module): bracket games named by round or "vs. TBD" read as their tournament and "at"; a multi-day event naming its host and its tournament reads as the tournament; a past swimming meet with no result line, story or TFRRS is not listed.

Each rule has a check in `tests/providence-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

Every sport shows three athletes on the preview. Official NIL marketplace: Opendorse (`providence-friars`, team "Providence Friars"). Profile cards fill the remaining slots in Swimming & Diving (the roster cards and profile pages publish fewer than three athlete Instagram accounts; `athlete_profile_fallback_sports`).

## Open

- Lacrosse and Softball (2026 pages) fill when published.
- First live cards not yet observed.
