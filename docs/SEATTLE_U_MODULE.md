# Seattle U school module

`src/schools/seattle-u.mjs` reads goseattleu.com (WMT, read directly (WMT JSON-API kit)), set up by `start-schools` on October 22, 2026 for the WCC (from the site's schedule API). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Golf, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Shared WCC rules (`tests/wcc-shared.mjs`): golf story headlines "... Capture ..." and "secure a third-place finish"; opponents "Saint Mary's (Calif.)", "St. Mary's", "USF" (San Francisco), "Seattle" count as members; the WCC sponsors men's water polo (Air Force, San José State, UC Davis affiliates) but no football, field hockey, lacrosse, hockey, wrestling or gymnastics.

Each rule has a check in `tests/seattle-u-module.mjs` (generated page blocks) or `tests/wcc-shared.mjs`; each new shared rule was mutated and its test failed. Soccer and volleyball records on the preview equal the page's own (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: INFLCR Exchange (`inflcr:seattle-university`). Every sport shows three athletes with verified Instagram. Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Baseball, Softball and Track & Field fill when published; the rowing roster renders no athletes (off the athlete list).
- First live cards not yet observed.
