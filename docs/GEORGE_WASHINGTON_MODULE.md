# George Washington school module

`src/schools/george-washington.mjs` reads gwsports.com (SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Atlantic 10 (ported from San Francisco's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Golf, Gymnastics, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Volleyball, Water Polo.

## Rules

- Men's tennis (2019-20) and women's water polo (2020) are past programs; water polo is the men's team in the MAWPC.
- Swim duals write scores in either order: the W or L orders them.
- Golf headlines name the team as "Golf" and stories as "GW".
- Shared Atlantic 10 rules (`tests/atlantic-10-shared.mjs`): golf story headlines naming "Golf", "--" datelines, "led ... to a fifth-place finish", "with a fifth-place finish", "Ties For", a team's possessive before a player's best score; browser-rendered rosters; opponents "GW", "Bonnies", "St. Joseph's", "SLU", "URI", "Loyola (Ill.)", "Mason", "Virginia Commonwealth" count as members; the Atlantic 10 sponsors no football, wrestling, gymnastics, hockey or water polo.

Each rule has a check in `tests/george-washington-module.mjs` (generated page blocks) or `tests/atlantic-10-shared.mjs`; each new shared rule was mutated and its test failed. Football, volleyball, soccer, field hockey and water polo records on the preview equal the page's own (Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Golf, Rowing (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Gymnastics and Softball fill when published.
- First live cards not yet observed.
