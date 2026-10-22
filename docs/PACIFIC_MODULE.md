# Pacific school module

`src/schools/pacific.mjs` reads pacifictigers.com (SIDEARM, read through the private source (older SIDEARM page)), set up by `start-schools` on October 22, 2026 for the WCC (ported from Middle Tennessee's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Beach Volleyball, Cross Country, Golf, STUNT, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo.

## Rules

- Every two-team sport reads its men's and women's pages (the scaffold's candidate lists were never pruned): cross country, track (`mens-track`), soccer, swimming, tennis, volleyball, water polo; golf is the men's team.
- Shared WCC rules (`tests/wcc-shared.mjs`): golf story headlines "... Capture ..." and "secure a third-place finish"; opponents "Saint Mary's (Calif.)", "St. Mary's", "USF" (San Francisco), "Seattle" count as members; the WCC sponsors men's water polo (Air Force, San José State, UC Davis affiliates) but no football, field hockey, lacrosse, hockey, wrestling or gymnastics.

Each rule has a check in `tests/pacific-module.mjs` (generated page blocks) or `tests/wcc-shared.mjs`; each new shared rule was mutated and its test failed. Soccer and volleyball records on the preview equal the page's own (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: INFLCR Exchange (`inflcr:university-of-the-pacific`). Profile cards fill the remaining slots in Baseball, Basketball, Beach Volleyball, Cross Country, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball, Water Polo (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Baseball, Beach Volleyball (2025-26 page), STUNT (roster lists coaches only: off the athlete list), Track & Field and women's Water Polo fill when published.
- First live cards not yet observed.
