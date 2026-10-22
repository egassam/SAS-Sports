# North Texas school module

`src/schools/north-texas.mjs` reads meangreensports.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the American (ported from Utah Valley's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Cross country is on the "Track & Field/XC" page: its fall meets are cross country, the rest track (TFRRS `TX_college_*_North_Texas`).
- Cross country places written first ("1st (M) / 3rd (W)") are read by the module.
- The Clerico (men's golf, Oct 19) takes its place from the story ("taking 11th in the field of 13").
- Shared American rules (`tests/american-shared.mjs`): team places written "Women's 11th"; the WMT API's "2nd/11", "Men's 4th / Women's 4th" and "No Team Result"; golf stories that say "taking 11th"; opponents "FAU", "USF", "UTSA", "UAB", "ECU", "Wichita" count as American members; the American sponsors no beach volleyball, gymnastics, wrestling, field hockey or hockey (no American record in those).

Each rule has a check in `tests/north-texas-module.mjs` (generated page blocks) or `tests/american-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer and field hockey record on the preview equals the page's own `schedule-record` (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: INFLCR Exchange (`inflcr:university-of-north-texas`). Profile cards fill the remaining slots in Swimming & Diving (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- The Chile Pepper Festival (Oct 3) shows the schedule's places until TFRRS publishes it.
- First live cards not yet observed.
