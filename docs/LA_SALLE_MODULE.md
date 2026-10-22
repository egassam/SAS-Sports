# La Salle school module

`src/schools/la-salle.mjs` reads goexplorers.com (SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Atlantic 10 (ported from San Francisco's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Acrobatics & Tumbling, Baseball, Basketball, Cross Country, Field Hockey, Golf, Lacrosse, Rowing, Soccer, Swimming & Diving, Track & Field, Triathlon, Water Polo.

## Rules

- Cross country, track and swimming read the team pages (the generic pages are 2010-13); rowing reads both teams; water polo is the women's team (the men's page is 2021); club sports in the menu are not listed.
- Shared Atlantic 10 rules (`tests/atlantic-10-shared.mjs`): golf story headlines naming "Golf", "--" datelines, "led ... to a fifth-place finish", "with a fifth-place finish", "Ties For", a team's possessive before a player's best score; browser-rendered rosters; opponents "GW", "Bonnies", "St. Joseph's", "SLU", "URI", "Loyola (Ill.)", "Mason", "Virginia Commonwealth" count as members; the Atlantic 10 sponsors no football, wrestling, gymnastics, hockey or water polo.

Each rule has a check in `tests/la-salle-module.mjs` (generated page blocks) or `tests/atlantic-10-shared.mjs`; each new shared rule was mutated and its test failed. Football, volleyball, soccer, field hockey and water polo records on the preview equal the page's own (Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Every sport shows three athletes with verified Instagram. Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- Acrobatics & Tumbling, Baseball, Lacrosse, Track & Field and Water Polo fill when published; triathlon finals show their stories without a place.
- First live cards not yet observed.
