# Richmond school module

`src/schools/richmond.mjs` reads richmondspiders.com (SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Atlantic 10 (ported from San Francisco's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Lacrosse, Soccer, Swimming & Diving, Tennis, Track & Field.

## Rules

- Football plays in the Patriot League; cross country has no men's TFRRS team.
- The page's record box can lag a same-day result (women's soccer 2-0 over VCU, Oct 22).
- Shared Atlantic 10 rules (`tests/atlantic-10-shared.mjs`): golf story headlines naming "Golf", "--" datelines, "led ... to a fifth-place finish", "with a fifth-place finish", "Ties For", a team's possessive before a player's best score; browser-rendered rosters; opponents "GW", "Bonnies", "St. Joseph's", "SLU", "URI", "Loyola (Ill.)", "Mason", "Virginia Commonwealth" count as members; the Atlantic 10 sponsors no football, wrestling, gymnastics, hockey or water polo.

Each rule has a check in `tests/richmond-module.mjs` (generated page blocks) or `tests/atlantic-10-shared.mjs`; each new shared rule was mutated and its test failed. Football, volleyball, soccer, field hockey and water polo records on the preview equal the page's own (Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: Opendorse (`richmond-spiders`). Profile cards fill the remaining slots in Lacrosse, Swimming & Diving, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Baseball, Lacrosse and Track & Field fill when published.
- First live cards not yet observed.
