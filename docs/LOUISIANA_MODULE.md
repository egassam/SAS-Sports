# Louisiana school module

`src/schools/louisiana.mjs` reads ragincajuns.com (Nuxt SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- TFRRS pages `LA_college_*_Louisiana_Lafayette` (TFRRS names the team "Louisiana"; not found by address).
- Golf places from the stories ("Cajuns Finish Tied For 11th").
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/louisiana-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Three Instagram athletes in every sport on the preview. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Moraine Intercollegiate (golf) reads "Completed" with its story: the story gives no team place.
- Track & Field fills when published.
- First live cards not yet observed.
