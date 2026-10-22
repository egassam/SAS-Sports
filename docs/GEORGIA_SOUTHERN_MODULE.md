# Georgia Southern school module

`src/schools/georgia-southern.mjs` reads gseagles.com (Nuxt SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Football, Golf, Rifle, Soccer, Softball, Swimming & Diving, Tennis, Volleyball.

## Rules

- Rifle duals and swimming meets read from the page data; swimming in the ASUN (no Sun Belt record).
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/georgia-southern-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Opendorse (`georgiasouthern-eagles`); three Instagram athletes in every sport on the preview. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Softball fills when 2027 is published.
- First live cards not yet observed.
