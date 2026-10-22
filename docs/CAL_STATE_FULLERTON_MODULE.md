# Cal State Fullerton school module

`src/schools/cal-state-fullerton.mjs` reads fullertontitans.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball, Water Polo.

## Rules

- TFRRS `CA_college_f_Cal_St_Fullerton` / `CA_college_m_Cal_St_Fullerton` (setup missed it: `start-schools` now tries every alias with "State" cut to "St").
- Tennis is a women's team only.
- INFLCR Exchange (`california-state-university-fullerton`).
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/cal-state-fullerton-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`california-state-university-fullerton`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22), three with verified Instagram in every sport.

## Open

- Baseball, Softball, Track & Field and women's water polo fill when published.
- First live cards not yet observed.
