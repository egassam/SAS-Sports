# UC Riverside school module

`src/schools/uc-riverside.mjs` reads gohighlanders.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Men's golf at the CDA National Reserve Invitational (Sep 21-22) reads "Completed" with its story: the card is empty and the story names no team place (only that Saint Mary's won).
- Volleyball at Cal Poly (Oct 17) has no result on gohighlanders.com (the page's own record, 4-15 and Big West 0-8, counts it): not listed until the score is posted, so the record reads 4-14 and 0-7.
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/uc-riverside-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Roster cards, then official profiles (no NIL marketplace linked from the site). Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). The official sources publish no athlete Instagram for any sport, so official profile cards fill the slots in every sport (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). Baseball's 2027 roster and the softball roster list no players yet: off the athlete list until they do.

## Open

- Tennis (both pages are 2025-26), Baseball, Softball and Track & Field fill when published.
- The Oct 17 volleyball score at Cal Poly: shown once gohighlanders.com posts it.
- Baseball and Softball athletes when their rosters list players.
- First live cards not yet observed.
