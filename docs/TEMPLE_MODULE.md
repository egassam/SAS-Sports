# Temple school module

`src/schools/temple.mjs` reads owlsports.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the American (ported from Utah Valley's handlers; Utah Valley's own rules removed). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Basketball, Cross Country, Fencing, Field Hockey, Football, Golf, Gymnastics, Lacrosse, Rowing, Soccer, Tennis, Track & Field, Volleyball.

## Rules

- Rowing is filed under "crew" (`womens-crew`, `mens-crew`; the scaffold's `womens-rowing` is the empty template); a regatta, head race or chase is a meet even when the page names no tournament (men's Navy Day Regatta and Head of the Charles).
- Field hockey plays in the Big East (the American sponsors none): Big East 1-3 as published.
- The Big 5 Classic (basketball, Dec 5-6), named after its event with no opponent drawn, reads "at".
- Women's soccer at Holy Family (Oct 4, W 3-0) keeps a stale "Postponed" note: the score decides (shared reader), 9-4-2 as published.
- Shared American rules (`tests/american-shared.mjs`): team places written "Women's 11th"; the WMT API's "2nd/11", "Men's 4th / Women's 4th" and "No Team Result"; golf stories that say "taking 11th"; opponents "FAU", "USF", "UTSA", "UAB", "ECU", "Wichita" count as American members; the American sponsors no beach volleyball, gymnastics, wrestling, field hockey, hockey or rowing (no American record in those).

Each rule has a check in `tests/temple-module.mjs` (generated page blocks) or `tests/american-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer and field hockey record on the preview equals the page's own `schedule-record` (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: INFLCR Exchange (`inflcr:temple-university`). Profile cards fill the remaining slots in Cross Country, Lacrosse, Rowing, Soccer, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Track & Field (2025-26 page) fills when published.
- First live cards not yet observed.
