# James Madison school module

`src/schools/james-madison.mjs` reads jmusports.com (Nuxt SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Field hockey and lacrosse outside the Sun Belt (no conference record); swimming in the American (no Sun Belt record).
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/james-madison-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Profile cards in Golf, Lacrosse, Tennis. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Baseball, Softball, Track & Field fill when 2027 is published.
- First live cards not yet observed.
