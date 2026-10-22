# Coastal Carolina school module

`src/schools/coastal-carolina.mjs` reads goccusports.com (Nuxt SIDEARM, read through the private source), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Lacrosse, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Cross country is on the Track & Field page: fall meets (August to November) are cross country, the rest track (Texas's rule); results from TFRRS (`SC_college_*_Coastal_Carolina`); the card's "Women (9th); Men (2nd)" is the team places.
- Golf cards with rounds in brackets ("1st of 16 (280-277-204=835)").
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/coastal-carolina-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Roster cards and profiles; profile cards in Baseball and Cross Country. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Beach Volleyball, Lacrosse, Softball, Track & Field fill when 2027 is published.
- The ITA All-American (women's tennis) shares a story with the College of Charleston Invite: the story stays with Charleston.
- First live cards not yet observed.
