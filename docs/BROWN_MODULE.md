# Brown school module

`src/schools/brown.mjs` reads brownbears.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Ivy League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (19): Baseball, Basketball, Cross Country, Equestrian, Fencing, Field Hockey, Football, Golf, Gymnastics, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Hockey plays in ECAC Hockey and gymnastics in the Gymnastics East Conference, as the pages mark them; equestrian names no league. Rowing reads the crew pages (`womens-crew`, `mens-crew`). The lacrosse and track rosters publish almost no portraits, so profiles without one fill the slots (`portraitlessProfileSports`).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Ivy League sponsors nearly every sport, wrestling (its pages mark the Ivy duals), fencing, field hockey, lacrosse and rowing among them; hockey is ECAC Hockey's; it sponsors no equestrian, skiing or water polo. Squash, sailing, polo, rugby, sprint football and archery are not sports the app lists.
- Shared Ivy League rules (`tests/ivy-shared.mjs`): rankings without a number, rowing boat places, rowing team labels, the Big 5 Classic an event.

Each rule has a check in `tests/brown-module.mjs` (generated page blocks) or `tests/ivy-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Cross Country, Equestrian, Fencing, Field Hockey, Football, Golf, Gymnastics, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Equestrian's league is not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
