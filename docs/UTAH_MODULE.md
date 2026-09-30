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

## Status (production `4.31.5-utah-tennis`, September 30)

| Sport | Production now | PR |
| --- | --- | --- |
| Football | 4 results `W, 31-17` style with exact recaps; 9 upcoming, published times | #45 |
| Cross Country | Recap race rows: team row, runners, `Women's Open` group | #46 |
| Soccer, Volleyball | 11 and 13 results in K-State format (unchanged) | — |
| Beach Volleyball | Empty-schedule note: `womens-beach-volleyball` still shows 2025 | #47 |
| Lacrosse | Empty-schedule note: `mens-lacrosse` still shows spring 2026 | #48 |
| Skiing | 31 upcoming 2027 races, `Meet · Race` | #49 |
| Golf | One event per tournament; completed ones read `Completed` (no official placing) | #50 |
| Tennis | 26 women's + 22 men's, labeled by team | #51 |
| Gymnastics | 1 upcoming (Dec 12); last season hidden by the academic-year filter | — |
| Swimming & Diving, Basketball | Both teams, labeled; upcoming only | — |
| Baseball, Softball | Upcoming only | — |
| Track & Field | Empty-schedule note | — |

**How the module handles utahutes.com.**
- **Missing slugs:** a slug the site lacks renders SIDEARM's "@season @sport Schedule" template. Its site-wide ticker lists other sports, and the shared matcher accepts indoor "Volleyball" for Beach Volleyball. Routes therefore name only real pages: `womens-beach-volleyball`, `mens-lacrosse`, `alpine-skiing`, `mens-golf`, `womens-tennis` + `mens-tennis`.
- **Past seasons:** for Beach Volleyball, Lacrosse and Skiing, `filterEvents` keeps only events in the page's own schedule data (`__NUXT_DATA__`) and in the current academic year (July–June). A page with none is an `empty_schedule`: the feed returns 200 `[]` and the app shows its note.
- **Golf:** each round day is its own entry. Consecutive days of one tournament merge into one event; it is Final only when every round is, and links the final round's recap.
- **Cross Country:** Utah sponsors women's XC only. Groups are `Women's` and `Women's Open`, without distance, since recaps give distances only in prose.

**Open:**
- Volleyball athlete certification (roster 403; see the handoff).
- Golf placings.
- Start times beyond Football.

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
