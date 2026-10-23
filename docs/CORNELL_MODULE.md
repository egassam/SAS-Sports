# Cornell school module

`src/schools/cornell.mjs` reads cornellbigred.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Ivy League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (19): Baseball, Basketball, Cross Country, Equestrian, Fencing, Field Hockey, Football, Golf, Gymnastics, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Hockey plays in ECAC Hockey; equestrian and gymnastics name no league. Rowing reads three pages: `womens-rowing`, `rowing` (men's heavyweight) and `mens-rowing` (men's lightweight), labelled by `teamLabels`. Rowing cards name the boat ("V8: 10th out of 19" reads "V8: 10th of 19") and can write the field as a place ("4th out of 48th" reads "4th of 48"). Rankings without a number ("#--/RV Dartmouth College") are dropped. Men's hockey's page publishes no record yet (Oct 23).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Ivy League sponsors nearly every sport, wrestling (its pages mark the Ivy duals), fencing, field hockey, lacrosse and rowing among them; hockey is ECAC Hockey's; it sponsors no equestrian, skiing or water polo. Squash, sailing, polo, rugby, sprint football and archery are not sports the app lists.
- Shared Ivy League rules (`tests/ivy-shared.mjs`): rankings without a number, rowing boat places, rowing team labels, the Big 5 Classic an event.

Each rule has a check in `tests/cornell-module.mjs` (generated page blocks) or `tests/ivy-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: INFLCR (`cornell-university`). Profile cards fill the remaining slots in Basketball, Cross Country, Equestrian, Fencing, Field Hockey, Football, Golf, Lacrosse, Rowing, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Fencing and gymnastics fill when their 2026-27 seasons are published.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
