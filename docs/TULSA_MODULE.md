# Tulsa school module

`src/schools/tulsa.mjs` reads tulsahurricane.com (SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the American (ported from Utah Valley's handlers; Utah Valley's own rules removed). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Basketball, Cross Country, Football, Golf, Rowing, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- A cross country meet entered by one team ("Cowboy Jamboree (Men)") reads as its team's place ("Men's team: 5th of 20").
- Rowing rows in the Big 12 (the American sponsors none); "vs. Kansas, Iowa, Minnesota and Kansas State" reads "Tulsa vs ...".
- Golf names written in capitals read capitalized ("Route 66 Invitational Honoring Dale McNamara").
- Award stories ("...-named-...", "player of the month") are no meet's story: the men's ITA Central Regional has none and is not listed.
- Shared American rules (`tests/american-shared.mjs`): team places written "Women's 11th"; the WMT API's "2nd/11", "Men's 4th / Women's 4th" and "No Team Result"; golf stories that say "taking 11th"; opponents "FAU", "USF", "UTSA", "UAB", "ECU", "Wichita" count as American members; the American sponsors no beach volleyball, gymnastics, wrestling, field hockey, hockey or rowing (no American record in those).

Each rule has a check in `tests/tulsa-module.mjs` (generated page blocks) or `tests/american-shared.mjs`; each new shared rule was mutated and its test failed. Every football, volleyball, soccer and field hockey record on the preview equals the page's own `schedule-record` (overall and conference, Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Cross Country, Golf, Rowing, Soccer, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Softball and Track & Field fill when published.
- First live cards not yet observed.
