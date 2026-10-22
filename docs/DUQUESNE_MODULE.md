# Duquesne school module

`src/schools/duquesne.mjs` reads goduquesne.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the Atlantic 10 (ported from San Francisco's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (14): Acrobatics & Tumbling, Basketball, Bowling, Cross Country, Football, Golf, Lacrosse, Rowing, Soccer, Swimming & Diving, Tennis, Track & Field, Triathlon, Volleyball.

## Rules

- Cross country, track and bowling read the team pages (the scaffold's routes were the homepage); bowling byes and scoreless matches are not results.
- Football plays in the NEC.
- Shared Atlantic 10 rules (`tests/atlantic-10-shared.mjs`): golf story headlines naming "Golf", "--" datelines, "led ... to a fifth-place finish", "with a fifth-place finish", "Ties For", a team's possessive before a player's best score; browser-rendered rosters; opponents "GW", "Bonnies", "St. Joseph's", "SLU", "URI", "Loyola (Ill.)", "Mason", "Virginia Commonwealth" count as members; the Atlantic 10 sponsors no football, wrestling, gymnastics, hockey or water polo.

Each rule has a check in `tests/duquesne-module.mjs` (generated page blocks) or `tests/atlantic-10-shared.mjs`; each new shared rule was mutated and its test failed. Football, volleyball, soccer, field hockey and water polo records on the preview equal the page's own (Oct 22).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: none linked. Profile cards fill the remaining slots in Tennis (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 22.

## Open

- First live cards not yet observed.
