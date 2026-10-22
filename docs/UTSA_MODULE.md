# UTSA school module

`src/schools/utsa.mjs` reads goutsa.com (WMT, read directly (WMT JSON-API kit)), set up by `start-schools` on October 22, 2026 for the American (from the site's schedule API). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Track & Field is the "Track & Field/Cross Country" team (id 14; cross country has its own team, id 54 since 2025).
- The API's results "Men's 4th / Women's 4th", "2nd/11", "T-10th/13" and "No Team Result" (golf: individuals only; tennis: completed) read by the shared kit.
- Shared American rules (`tests/american-shared.mjs`): team places written "Women's 11th"; the WMT API's "2nd/11", "Men's 4th / Women's 4th" and "No Team Result"; golf stories that say "taking 11th"; opponents "FAU", "USF", "UTSA", "UAB", "ECU", "Wichita" count as American members; the American sponsors no beach volleyball, gymnastics, wrestling, field hockey or hockey (no American record in those).

Each rule has a check in `tests/utsa-module.mjs` (generated page blocks) or `tests/american-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer and field hockey record on the preview equals the page's own `schedule-record` (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Basketball, Cross Country, Golf, Softball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Track & Field fills when 2026-27 is published (roster empty: off the athlete list).
- First live cards not yet observed.
