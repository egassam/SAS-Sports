# DePaul school module

`src/schools/depaul.mjs` reads depaulbluedemons.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from NC State's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

DePaul was added to the app on October 21, 2026 in the Big East (8 sports: Basketball, Cross Country, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball). depaulbluedemons.com is read directly.

## Rules

- Women's tennis names the host and the tournament ("Michigan State", "Spartan Invite"): a multi-day event reads as its tournament.
- Men's tennis types its fall tournaments "S": multi-day events are not labeled exhibitions.
- Storyless tennis tournaments (River Forest, WMU/Vredevelt) are not listed.
- Shared Big East rules (every module): bracket games named by round or "vs. TBD" read as their tournament and "at"; a multi-day event naming its host and its tournament reads as the tournament; a past swimming meet with no result line, story or TFRRS is not listed.

Each rule has a check in `tests/depaul-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

Every sport shows three athletes on the preview. Official NIL marketplace: INFLCR Exchange (`depaul-university`). Three Instagram athletes in every sport.

## Open

- Track & Field (2025-26 page) and Softball fill when 2026-27 is published.
- First live cards not yet observed.
