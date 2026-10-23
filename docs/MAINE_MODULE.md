# Maine school module

`src/schools/maine.mjs` reads goblackbears.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the America East (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Field Hockey, Football, Hockey, Soccer, Softball, Swimming & Diving, Track & Field.

## Rules

- Football plays in the CAA and hockey in Hockey East. Cross country's opener was a home dual with Army (Sep 4): it reads "Maine vs Army" with the team scores, the one meet not read "at" (it was at home, not at Army).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the America East sponsors tennis but no football (CAA), hockey (Hockey East), wrestling, rowing, golf or gymnastics.
- Shared America East rules (`tests/america-east-shared.mjs`): cross country places with their points ("2nd, 52 points", A and B teams), TFRRS pages from the meets a schedule links, bowling days merged and storyless bowling left out, alumnae meets internal.

Each rule has a check in `tests/maine-module.mjs` (generated page blocks) or `tests/america-east-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Basketball, Cross Country, Football, Hockey, Soccer, Softball, Swimming & Diving, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (the eight schools, none failed).

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
