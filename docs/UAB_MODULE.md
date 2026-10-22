# UAB school module

`src/schools/uab.mjs` reads uabsports.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the American (ported from Utah Valley's handlers; Utah Valley's own rules removed). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Beach Volleyball, Bowling, Cross Country, Football, Golf, Rifle, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Track & Field reads `womens-track-and-field` (the generic page is 2021); cross country is the women's team only (no men's TFRRS).
- A bowling tournament's match record and place ("5-8, 6th of 14") read as the place with the record beside it.
- Shared American rules (`tests/american-shared.mjs`): team places written "Women's 11th"; the WMT API's "2nd/11", "Men's 4th / Women's 4th" and "No Team Result"; golf stories that say "taking 11th"; opponents "FAU", "USF", "UTSA", "UAB", "ECU", "Wichita" count as American members; the American sponsors no beach volleyball, gymnastics, wrestling, field hockey, hockey or rowing (no American record in those).

Each rule has a check in `tests/uab-module.mjs` (generated page blocks) or `tests/american-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer and field hockey record on the preview equals the page's own `schedule-record` (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Basketball, Golf, Soccer, Tennis, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Track & Field, Beach Volleyball and Softball fill when published.
- First live cards not yet observed.
