# California Baptist school module

`src/schools/cal-baptist.mjs` reads cbulancers.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Golf, STUNT, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball, Water Polo.

## Rules

- Cross country and track share one page (`/sports/xctrack`, "Cross Country & Track"): the fall meets (August-November) are cross country, the rest track (Miami (OH)'s rule). TFRRS `CA_college_f_California_Baptist` / `CA_college_m_California_Baptist`.
- Golf and swimming are women's teams only (`womens-golf`, `womens-swim`): the nav links no men's team, and the men's pages are 2025-26.
- Softball's tournament games whose opponents are not yet drawn ("CBU Classic", "Mary Nutter Collegiate Classic", Feb-Mar) read "at" the tournament.
- The athlete profiles carry Instagram's embed script (`instagram.com/embed.js`): never read as a handle (setup had pinned it for seven athletes; removed).
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/cal-baptist-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Roster cards, then official profiles (no NIL marketplace linked from the site). Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). The official sources publish no athlete Instagram for any sport (the profile bios link only Instagram's embed script), so official profile cards fill the slots in every sport (`athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- STUNT, Baseball, Softball, Track & Field and women's water polo fill when published.
- First live cards not yet observed.
