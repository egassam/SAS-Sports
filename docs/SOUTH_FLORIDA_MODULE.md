# South Florida school module

`src/schools/south-florida.mjs` reads gousfbulls.com (SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the American (ported from Utah Valley's handlers; Utah Valley's own rules removed). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Football, Golf, Lacrosse, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Shared American rules (`tests/american-shared.mjs`): team places written "Women's 11th"; the WMT API's "2nd/11", "Men's 4th / Women's 4th" and "No Team Result"; golf stories that say "taking 11th"; opponents "FAU", "USF", "UTSA", "UAB", "ECU", "Wichita" count as American members; the American sponsors no beach volleyball, gymnastics, wrestling, field hockey, hockey or rowing (no American record in those).

Each rule has a check in `tests/south-florida-module.mjs` (generated page blocks) or `tests/american-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer and field hockey record on the preview equals the page's own `schedule-record` (overall and conference, Oct 22).

- A golf tournament with no card place that shares its story with a same-day tournament that has one is an individuals-only entry (the Eckerd Invitational, Sep 21-22: one player, "Holly McLean played in the 2026 Eckerd Invitational"; the team placed 7th at the Canadian Collegiate): "No team score (individuals only)" (Oct 25).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Every sport shows three athletes with verified Instagram. Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Lacrosse and Track & Field fill when published.
- First live cards not yet observed.
