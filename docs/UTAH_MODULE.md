# Utah school module

`src/schools/utah.mjs` owns Utah's utahutes.com schedule and roster routes and its program combinations. The Worker imports its configuration; the event/result contract, caching, display and generic SIDEARM parsing remain shared.

## Setup (route parity)

The module starts as a pure move. Each of Utah's 15 sponsored sports gets exactly the schedule and roster candidates production used before the module existed:
- the four inline routes (Cross Country, Soccer, Volleyball, Football) moved out of `src/index.js`;
- the other 11 sports' generic fallbacks are now written out explicitly.

`combinedSports` keeps the shared policy Utah used before (Basketball, Swimming & Diving).

A before/after dump of all 219 catalog school/sport schedule and roster routes (plus combination flags) was identical. `VERSION` was not bumped, since output is unchanged.

`npm run test:utah-module` (also in `npm test` and `npm run test:release`) checks:
- all 15 sports route to utahutes.com through the module;
- no `'utah|` configuration remains in `src/index.js`;
- the program combinations are unchanged.

## Baseline vs K-State (production `4.29.12`, September 30)

| Sport | Now | Gap vs K-State |
| --- | --- | --- |
| Football | 4 results, 9 upcoming | `31-17`, no W/L, no recap |
| Cross Country | 3 results | `2nd / 28` summary only; no race groups |
| Soccer, Volleyball | 11 and 13 results | Already K-State format with recaps; Volleyball athlete certification fails ("no verified Instagram destination") |
| Beach Volleyball | 2 results | `3–1`, no W/L, no recap |
| Golf | 1 event today, 0 results | Past tournaments missing |
| Lacrosse | 14 results | Spring 2026 games shown as current results |
| Skiing | 502 | No usable source |
| Gymnastics | 1 upcoming | Season starts in January; needs a check |
| Baseball, Basketball, Softball, Swimming & Diving, Tennis | Upcoming only | Schedule and start-time check |
| Track & Field | `[]` | Fine |

utahutes.com returned HTTP 403 (bot protection) to the development sandbox on September 30; fixtures depend on retries. It was not circumvented.
