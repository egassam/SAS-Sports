# UC Irvine school module

`src/schools/uc-irvine.mjs` reads ucirvinesports.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Golf, Soccer, Tennis, Track & Field, Volleyball, Water Polo.

## Rules

- Golf cards name the round first ("Final - 15th (905)"): the CDA National Reserve now reads 15th (its story had given a player's "T79th").
- Volleyball combines the women's and men's pages; men's volleyball fills when the 2027 schedule is published.
- INFLCR Exchange (`university-of-california-irvine`).
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/uc-irvine-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`university-of-california-irvine`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Cross Country, Golf, Soccer, Tennis, Volleyball, Water Polo (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Baseball, Track & Field, men's volleyball and women's water polo fill when published.
- First live cards not yet observed.
