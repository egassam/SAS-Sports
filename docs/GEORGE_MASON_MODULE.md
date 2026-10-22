# George Mason school module

`src/schools/george-mason.mjs` reads gomason.com (SIDEARM, read through the private source (browser-rendered SIDEARM page)), set up by `start-schools` on October 22, 2026 for the Atlantic 10 (ported from San Francisco's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Golf, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Rosters list their players as page data (no athlete links): the shared roster reader reads them (`rosterPagePlayers`).
- Cross country, track and volleyball read the team pages; golf story forms "led the Patriots to a fifth-place finish" and a "--" dateline (shared).
- Its schedule pages render their records in the browser (no page record to compare).
- Shared Atlantic 10 rules (`tests/atlantic-10-shared.mjs`): golf story headlines naming "Golf", "--" datelines, "led ... to a fifth-place finish", "with a fifth-place finish", "Ties For", a team's possessive before a player's best score; browser-rendered rosters; opponents "GW", "Bonnies", "St. Joseph's", "SLU", "URI", "Loyola (Ill.)", "Mason", "Virginia Commonwealth" count as members; the Atlantic 10 sponsors no football, wrestling, gymnastics, hockey or water polo.

Each rule has a check in `tests/george-mason-module.mjs` (generated page blocks) or `tests/atlantic-10-shared.mjs`; each new shared rule was mutated and its test failed. Football, volleyball, soccer, field hockey and water polo records on the preview equal the page's own (Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Baseball, Golf, Lacrosse, Rowing, Swimming & Diving, Tennis, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Baseball, Softball, Rowing (2025-26 page), Track & Field and men's Volleyball fill when published.
- First live cards not yet observed.
