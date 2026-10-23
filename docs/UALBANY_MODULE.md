# UAlbany school module

`src/schools/ualbany.mjs` reads ualbanysports.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the America East (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Lacrosse, Rowing, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Football plays in the CAA (the page marks its CAA games); golf and rowing name no league. TFRRS names the team "Albany" (NY_college_f_Albany).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the America East sponsors tennis but no football (CAA), hockey (Hockey East), wrestling, rowing, golf or gymnastics.
- Shared America East rules (`tests/america-east-shared.mjs`): cross country places with their points ("2nd, 52 points", A and B teams), TFRRS pages from the meets a schedule links, bowling days merged and storyless bowling left out, alumnae meets internal.

Each rule has a check in `tests/ualbany-module.mjs` (generated page blocks) or `tests/america-east-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Lacrosse, Rowing, Soccer, Softball, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (the eight schools, none failed).

## Open

- Golf and rowing leagues are not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
