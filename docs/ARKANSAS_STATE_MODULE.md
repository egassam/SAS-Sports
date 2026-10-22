# Arkansas State school module

`src/schools/arkansas-state.mjs` reads astateredwolves.com (SIDEARM (older page, row reader), read through the private source), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Soccer, Tennis, Track & Field, Volleyball.

## Rules

- Women's bowling on `/sports/womens-bowling` (the setup read `/sports/bowling`, a generic page).
- Two tennis tournaments the same weekend linked one story: the ITA All-Americans no longer take the Memphis Invite story and, storyless, are not listed.
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/arkansas-state-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

None linked: profile cards fill every sport (rosters and profiles publish no athlete Instagram); baseball and track rosters have no portraits yet (`portraitlessProfileSports`). See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Baseball and Track & Field fill when 2027 is published.
- First live cards not yet observed.
