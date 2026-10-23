# Bryant school module

`src/schools/bryant.mjs` reads bryantbulldogs.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the America East (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (15): Baseball, Basketball, Bowling, Cross Country, Field Hockey, Football, Golf, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Football plays in the CAA; golf, rowing and bowling name no league. Bowling lists each day of an event: the days are one event, and one without a result or story is not listed (the Chelsea Gilliam Penguin Classic, Oct 16-18). Opendorse marketplace `bryant-bulldogs`.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the America East sponsors tennis but no football (CAA), hockey (Hockey East), wrestling, rowing, golf or gymnastics.
- Shared America East rules (`tests/america-east-shared.mjs`): cross country places with their points ("2nd, 52 points", A and B teams), TFRRS pages from the meets a schedule links, bowling days merged and storyless bowling left out, alumnae meets internal.

Each rule has a check in `tests/bryant-module.mjs` (generated page blocks) or `tests/america-east-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: Opendorse (`bryant-bulldogs`). Profile cards fill the remaining slots in Baseball, Bowling, Cross Country, Field Hockey, Football, Golf, Lacrosse, Rowing, Soccer, Swimming & Diving, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (the eight schools, none failed).

## Open

- Golf, rowing and bowling leagues are not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
