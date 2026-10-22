# Louisiana Tech school module

`src/schools/louisiana-tech.mjs` reads latechsports.com (Nuxt SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Joined the Sun Belt for 2026 (in the standings with a 2-0 record on Oct 22).
- Men's golf on `/sports/mens-golf` (the `/sports/golf` page is 2023-24).
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/louisiana-tech-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Three Instagram athletes in every sport on the preview. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Track & Field fills when published.
- First live cards not yet observed.
