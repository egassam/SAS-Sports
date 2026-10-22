# Old Dominion school module

`src/schools/old-dominion.mjs` reads odusports.com (WMT JSON API (`/website-api`, shared kit)), set up by `start-schools` on October 22, 2026 for the Sun Belt. The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Field Hockey, Football, Golf, Lacrosse, Rowing, Soccer, Swimming & Diving, Tennis, Volleyball, Wrestling.

## Rules

- Swimming & Diving (`swimming`, id 4, ASUN) added: the setup missed it (its API entry lists no `schedule_id`). Wrestling is not sponsored (the site hides it; its pages end with 2019-20).
- Women's golf played as individuals at the Spider Invitational reads its published line.
- Shared Sun Belt rules (every module, from Montana's port with each school's own nicknames): rounds, conferences, tournaments and championship games read "at"; golf places from the card or the final story; one story per tennis tournament; the Sun Belt sponsors no swimming, lacrosse, field hockey, wrestling or rowing (no conference record in those).

Each rule has a check in `tests/old-dominion-module.mjs` (generated page blocks plus hand checks) or `tests/sun-belt-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Profile cards in most sports (rosters link no athlete Instagram); Football has three Instagram athletes. See `athlete_profile_fallback_sports` in `tests/certified-schools.json`.

## Open

- Baseball athletes when the 2027 roster lists players (season roster only); Baseball and Lacrosse schedules fill when published.
- First live cards not yet observed.
