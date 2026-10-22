# UC Santa Barbara school module

`src/schools/uc-santa-barbara.mjs` reads ucsbgauchos.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo.

## Rules

- The homepage is a SIDEARM splash page with no menu: `add-school` now reads a sport page's menu behind it.
- Cross country and track are on team pages (`mens-`/`womens-cross-country`, `mens-`/`womens-track-and-field`; the generic routes were ticket pages). Volleyball combines the women's and men's pages. Golf is a men's team only.
- Men's soccer vs LMU (Aug 14) is a "Pre-Season Friendly": an exhibition, out of the record (8-3-4 as published).
- TFRRS `CA_college_f_UC_Santa_Barbara` / `CA_college_m_UC_Santa_Barbara`.
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/uc-santa-barbara-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Roster cards, then official profiles (no NIL marketplace linked from the site). Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Baseball, Softball, Track & Field, men's volleyball and women's water polo fill when published.
- First live cards not yet observed.
