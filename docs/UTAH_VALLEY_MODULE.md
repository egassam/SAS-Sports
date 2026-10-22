# Utah Valley school module

`src/schools/utah-valley.mjs` reads gouvu.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Track & Field, Volleyball, Wrestling.

## Rules

- Wrestling stays in the Big 12: the module names the league.
- Men's soccer games billed "Pac-12 Crossover" (at Cal Poly Oct 14, at San Diego State Oct 21, Oregon State Oct 24) are non-conference: Big West 4-1 as gouvu.com publishes.
- The bracket final "Big West Final" reads "at".
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/utah-valley-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Roster cards, then official profiles (no NIL marketplace linked from the site). Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Golf (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Track & Field (2025-26 page) fills when published.
- First live cards not yet observed.
