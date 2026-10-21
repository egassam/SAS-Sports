# Seton Hall school module

`src/schools/seton-hall.mjs` reads shupirates.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from NC State's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Seton Hall was added to the app on October 21, 2026 in the Big East (9 sports: Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Tennis, Volleyball). shupirates.com is read directly.

## Rules

- Cross country: per-team pages and TFRRS (shared helper).
- Swimming: the diving-only Colgate session (Oct 17, "No Score") is not listed; the day's story is the Monmouth dual's.
- Shared Big East rules (every module): bracket games named by round or "vs. TBD" read as their tournament and "at"; a multi-day event naming its host and its tournament reads as the tournament; a past swimming meet with no result line, story or TFRRS is not listed.

Each rule has a check in `tests/seton-hall-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

Every sport shows three athletes on the preview. No NIL marketplace linked. Profile cards fill the remaining slots in Cross Country, Softball, Swimming & Diving, Tennis (the roster cards and profile pages publish fewer than three athlete Instagram accounts; `athlete_profile_fallback_sports`).

## Open

- Baseball and Softball (2026 pages) fill when published.
- First live cards not yet observed.
