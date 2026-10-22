# Florida Atlantic school module

`src/schools/fau.mjs` reads fausports.com (SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the American (ported from Utah Valley's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Women's cross country is on the women's "XC/Track & Field" page: its fall meets (August-November) are cross country and the rest track, as at Miami (OH); the men's cross country page is all fall.
- Swimming & Diving reads the current combined page (`swimming-and-diving`); the men's page is 2023-24.
- A swimming opponent's squad note ("Florida (Men S&D / Women's Diving)", "FIU (Women Only)") is not part of its name.
- Shared American rules (`tests/american-shared.mjs`): team places written "Women's 11th"; the WMT API's "2nd/11", "Men's 4th / Women's 4th" and "No Team Result"; golf stories that say "taking 11th"; opponents "FAU", "USF", "UTSA", "UAB", "ECU", "Wichita" count as American members; the American sponsors no beach volleyball, gymnastics, wrestling, field hockey or hockey (no American record in those).

Each rule has a check in `tests/fau-module.mjs` (generated page blocks) or `tests/american-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer and field hockey record on the preview equals the page's own `schedule-record` (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: Opendorse (`fau-owls`). Profile cards fill the remaining slots in Beach Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Track & Field (spring) fills when published.
- First live cards not yet observed.
