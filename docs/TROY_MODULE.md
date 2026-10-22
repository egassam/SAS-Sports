# Troy school module

`src/schools/troy.mjs` reads troytrojans.com (Nuxt SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- "Sun Belt Championship Game" reads "at".
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/troy-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Opendorse (`troy-trojans`); profile cards in Golf. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Baseball, Softball, Track & Field fill when published.
- First live cards not yet observed.
