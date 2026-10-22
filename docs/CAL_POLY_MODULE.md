# Cal Poly school module

`src/schools/cal-poly.mjs` reads gopoly.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Football plays in the Big Sky (4-4, Big Sky 3-2 as published) and wrestling in the Pac-12 (from 2026-27): the module names the league; the page data marks the league games. Men's soccer plays in the Pac-12 too (other schools' pages bill those games "Pac-12 Crossover"); its page data marks its own league games.
- Women's soccer is `/sports/womens-soccer` (the nav also links the same page as `wsoc`).
- Golf: the men's cards spell the place ("Ninth"), and the Saint Mary's Invitational (Oct 19-21) has no card place: its story gives "slipped from fifth to eighth" (8th).
- INFLCR Exchange (`cal-poly`).
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/cal-poly-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`cal-poly`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). The official sources publish no athlete Instagram for any sport, so official profile cards fill the slots in every sport (`athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Beach Volleyball, Baseball, Softball and Track & Field fill when published.
- First live cards not yet observed.
