# East Carolina school module

`src/schools/east-carolina.mjs` reads ecupirates.com (SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the American (ported from Utah Valley's handlers; Utah Valley's own rules removed). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Football, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Swimming & Diving and Tennis are the women's teams only: the men's pages are 2019-20 (programs cut in 2020) and the generic swimming page is 2016-17.
- Cross country places "Women's 11th; Men's DNF" read by the shared rule.
- Shared American rules (`tests/american-shared.mjs`): team places written "Women's 11th"; the WMT API's "2nd/11", "Men's 4th / Women's 4th" and "No Team Result"; golf stories that say "taking 11th"; opponents "FAU", "USF", "UTSA", "UAB", "ECU", "Wichita" count as American members; the American sponsors no beach volleyball, gymnastics, wrestling, field hockey, hockey or rowing (no American record in those).

Each rule has a check in `tests/east-carolina-module.mjs` (generated page blocks) or `tests/american-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer and field hockey record on the preview equals the page's own `schedule-record` (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: INFLCR Exchange (`inflcr:east-carolina-university`). Profile cards fill the remaining slots in Basketball, Cross Country, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Baseball, Softball, Lacrosse and Track & Field fill when published.
- First live cards not yet observed.
