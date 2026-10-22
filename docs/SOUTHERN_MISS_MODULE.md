# Southern Miss school module

`src/schools/southern-miss.mjs` reads southernmiss.com (Nuxt SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Beach Volleyball (`/sports/bvb`) added: the setup missed it.
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/southern-miss-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`university-of-southern-mississippi`); profile cards in Baseball, Cross Country, Tennis. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Baseball, Beach Volleyball, Track & Field fill when published; Chile Pepper Festival (XC) shows the schedule's place until TFRRS publishes it.
- First live cards not yet observed.
