# ULM school module

`src/schools/ulm.mjs` reads ulmwarhawks.com (SIDEARM (older page, row reader), read through the private source), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Beach volleyball on `/sports/womens-beach-volleyball` (the setup had left the homepage).
- ULM no longer sponsors tennis (its page is 2024-25).
- Golf places from stories ("The team finished 15th out of 17").
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/ulm-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Profile cards in Baseball, Basketball, Beach Volleyball, Cross Country, Golf, Track & Field, Volleyball. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Baseball, Softball, Track & Field, Beach Volleyball fill when published.
- First live cards not yet observed.
