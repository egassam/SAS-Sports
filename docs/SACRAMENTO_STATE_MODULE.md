# Sacramento State school module

`src/schools/sacramento-state.mjs` reads hornetsports.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Gymnastics, Rowing, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Football plays in the MAC from 2026 (1-6, MAC 0-4 as published): the module names the league.
- Beach volleyball is `womens-beach-volleyball` and track `/sports/track` (the scaffold's routes were the homepage).
- The rowing regatta "Head of the American" (Oct 24) reads "at".
- INFLCR Exchange (`sacramento-state`).
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/sacramento-state-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`sacramento-state`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Basketball, Beach Volleyball, Cross Country, Golf, Gymnastics, Rowing, Soccer, Softball, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Beach Volleyball, Baseball, Gymnastics and Track & Field fill when published.
- First live cards not yet observed.
