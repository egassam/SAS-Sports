# Marshall school module

`src/schools/marshall.mjs` reads herdzone.com (Nuxt SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Football, Golf, STUNT, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- STUNT's schedule and roster are SIDEARM's empty "@season" template: a valid empty schedule (USC's rule) and off the athlete list until a roster is published.
- Golf places from stories ("which tied them for 5th place").
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/marshall-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`marshall-university`); profile cards in Basketball, Football, Tennis. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- STUNT schedule and athletes when published; Rocket Classic, UNCG Fall (women's golf) and Tom Tontimonia (men's) read "Completed" with stories that give no team place.
- First live cards not yet observed.
