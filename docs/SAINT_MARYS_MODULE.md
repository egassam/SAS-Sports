# Saint Mary's school module

`src/schools/saint-marys.mjs` reads smcgaels.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the WCC (ported from Middle Tennessee's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Beach Volleyball, Cross Country, Golf, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo.

## Rules

- Cross country and track read the team pages (the generic cross country page is the 2023 men's; `track-and-field` is the men's); TFRRS `CA_college_*_St_Marys_CA`.
- Water polo is the men's team (the women's page is the empty template).
- Shared WCC rules (`tests/wcc-shared.mjs`): golf story headlines "... Capture ..." and "secure a third-place finish"; opponents "Saint Mary's (Calif.)", "St. Mary's", "USF" (San Francisco), "Seattle" count as members; the WCC sponsors men's water polo (Air Force, San José State, UC Davis affiliates) but no football, field hockey, lacrosse, hockey, wrestling or gymnastics.

Each rule has a check in `tests/saint-marys-module.mjs` (generated page blocks) or `tests/wcc-shared.mjs`; each new shared rule was mutated and its test failed. Soccer and volleyball records on the preview equal the page's own (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Basketball, Beach Volleyball, Cross Country, Golf, Rowing, Softball, Track & Field, Volleyball, Water Polo (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Baseball, Softball, Beach Volleyball, Rowing and Track & Field fill when published.
- First live cards not yet observed.
