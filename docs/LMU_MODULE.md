# Loyola Marymount school module

`src/schools/lmu.mjs` reads lmulions.com (SIDEARM, read through the private source (older SIDEARM page)), set up by `start-schools` on October 22, 2026 for the WCC (ported from Middle Tennessee's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Beach Volleyball, Cross Country, Golf, Soccer, Softball, Tennis, Volleyball, Water Polo.

## Rules

- Cross country is the women's team (`womens-cross-country`; the generic page is the 2023 men's)
- Beach volleyball reads `womens-beach-volleyball` (the scaffold's route was the homepage).
- Shared WCC rules (`tests/wcc-shared.mjs`): golf story headlines "... Capture ..." and "secure a third-place finish"; opponents "Saint Mary's (Calif.)", "St. Mary's", "USF" (San Francisco), "Seattle" count as members; the WCC sponsors men's water polo (Air Force, San José State, UC Davis affiliates) but no football, field hockey, lacrosse, hockey, wrestling or gymnastics.

Each rule has a check in `tests/lmu-module.mjs` (generated page blocks) or `tests/wcc-shared.mjs`; each new shared rule was mutated and its test failed. Soccer and volleyball records on the preview equal the page's own (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Baseball, Cross Country, Golf, Softball, Tennis, Volleyball, Water Polo (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Baseball, Softball, Beach Volleyball and women's Water Polo fill when published.
- First live cards not yet observed.
