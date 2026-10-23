# Dartmouth school module

`src/schools/dartmouth.mjs` reads dartmouthsports.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Ivy League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (17): Baseball, Basketball, Cross Country, Equestrian, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, Skiing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Hockey plays in ECAC Hockey; equestrian and skiing name no league. Rowing reads `womens-rowing`, `mens-rowing` (heavyweight) and `rowing` (lightweight), labelled by `teamLabels`. Skiing (`alpine-skiing`) is still the 2025-26 season.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Ivy League sponsors nearly every sport, wrestling (its pages mark the Ivy duals), fencing, field hockey, lacrosse and rowing among them; hockey is ECAC Hockey's; it sponsors no equestrian, skiing or water polo. Squash, sailing, polo, rugby, sprint football and archery are not sports the app lists.
- Shared Ivy League rules (`tests/ivy-shared.mjs`): rankings without a number, rowing boat places, rowing team labels, the Big 5 Classic an event.

Each rule has a check in `tests/dartmouth-module.mjs` (generated page blocks) or `tests/ivy-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Equestrian, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, Skiing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Skiing fills when its 2026-27 season is published; its league is not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
