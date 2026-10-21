# Marquette school module

`src/schools/marquette.mjs` reads gomarquette.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from NC State's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Marquette was added to the app on October 21, 2026 in the Big East (8 sports: Basketball, Cross Country, Golf, Lacrosse, Soccer, Tennis, Track & Field, Volleyball). gomarquette.com is read through the private source (Imperva answers the sandbox with 403).

## Rules

- Golf cards "T6th of 9 (276-283-291--850)" read as place in the field and team score; Quail Valley (no card place) takes 5th from its story headline ("Close Fall With Fifth-Place Finish", shared golf story reader).
- Swimming & Diving removed: the page is an empty "@season @sport" template (Marquette sponsors no swimming).
- Women's basketball "Big East" in the "BIG EAST Championship" reads as the championship (case-insensitive).
- Shared Big East rules (every module): bracket games named by round or "vs. TBD" read as their tournament and "at"; a multi-day event naming its host and its tournament reads as the tournament; a past swimming meet with no result line, story or TFRRS is not listed.

Each rule has a check in `tests/marquette-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

Every sport shows three athletes on the preview. Official NIL marketplace: INFLCR Exchange (`marquette-university`). Profile cards fill the remaining slots in Cross Country, Golf, Tennis, Track & Field (the roster cards and profile pages publish fewer than three athlete Instagram accounts; `athlete_profile_fallback_sports`).

## Open

- Lacrosse (2026 pages) and Track & Field (2025-26) fill when published.
- First live cards not yet observed.
