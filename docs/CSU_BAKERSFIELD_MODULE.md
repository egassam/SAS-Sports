# CSU Bakersfield school module

`src/schools/csu-bakersfield.mjs` reads gorunners.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the Big West (ported from Toledo's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Beach Volleyball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball, Wrestling.

## Rules

- The homepage is a SIDEARM splash page with no menu: `add-school` now reads a sport page's menu behind it (shared `isSidearmSplash`).
- Cross country and golf are women's teams only (`womens-cross-country`, `womens-golf`; the men's golf page is 2016-17 and the nav links neither men's team); TFRRS `CA_college_f_Cal_St_Bakersfield`. Beach volleyball is `womens-beach-volleyball` (the generic route was a promotion page).
- Wrestling wrestles in the Pac-12 (from 2026-27): the module names the league.
- Swimming's "(Dive only)" meet with Claremont-Mudd-Scripps (Oct 3) reads "Completed" with its story: the page publishes no score for a diving-only meet.
- Shared Big West rules (`tests/big-west-shared.mjs`): golf card places in Big West forms ("Final - 15th (905)", "2nd/14; Phi, T3rd", "Ninth"; shared `golfCardPlace`) and a team's final-day move in its story ("slipped from fifth to eighth"); opponents "Long Beach St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB", "Sac State" count as Big West members, and Hawaii does for men's volleyball, beach volleyball and women's water polo; the Big West sponsors no football, swimming, wrestling or rowing (no Big West record in those); a game billed "Crossover" with another league is non-conference; a row's "Exhibition"/"Pre-Season Friendly" promotion makes it an exhibition; a game named by its tournament (opponents not yet drawn) and a bracket final read "at"; a rowing "Head of the ..." reads "at"; Instagram's `embed.js` is no handle.

Each rule has a check in `tests/csu-bakersfield-module.mjs` (generated page blocks plus hand checks) or `tests/big-west-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Roster cards, then official profiles (no NIL marketplace linked from the site). Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Beach Volleyball, Baseball, Softball and Track & Field fill when published.
- First live cards not yet observed.
