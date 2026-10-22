# Saint Joseph's school module

`src/schools/saint-josephs.mjs` reads sjuhawks.com (SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Atlantic 10 (ported from San Francisco's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Field Hockey, Golf, Lacrosse, Rowing, Soccer, Softball, Tennis, Track & Field.

## Rules

- Cross country and track read the team pages (TFRRS `PA_college_*_St_Josephs_PA`); rowing reads both teams; the Big 5 Classic reads "at".
- Golf: a player's line beside the team's possessive ("the Hawks' lowest score") is not the team's place (shared).
- Shared Atlantic 10 rules (`tests/atlantic-10-shared.mjs`): golf story headlines naming "Golf", "--" datelines, "led ... to a fifth-place finish", "with a fifth-place finish", "Ties For", a team's possessive before a player's best score; browser-rendered rosters; opponents "GW", "Bonnies", "St. Joseph's", "SLU", "URI", "Loyola (Ill.)", "Mason", "Virginia Commonwealth" count as members; the Atlantic 10 sponsors no football, wrestling, gymnastics, hockey or water polo.

Each rule has a check in `tests/saint-josephs-module.mjs` (generated page blocks) or `tests/atlantic-10-shared.mjs`; each new shared rule was mutated and its test failed. Football, volleyball, soccer, field hockey and water polo records on the preview equal the page's own (Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Every sport shows three athletes with verified Instagram. Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Lacrosse, Softball and Track & Field fill when published.
- First live cards not yet observed.
