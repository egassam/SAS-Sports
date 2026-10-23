# NJIT school module

`src/schools/njit.mjs` reads njithighlanders.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the America East (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Fencing, Hockey, Lacrosse, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- TFRRS names the team "New_Jersey_Institute_Technolog" (found on the meets its schedule links). Swimming is the men's page (the women's is 2009-10); volleyball reads both teams (men's spring season); bowling is not listed (its last season and roster are 2024-25). Hockey, fencing and men's volleyball name no league. Hockey's record box counts four of its six listed finals (1-3; the app's 1-5 counts every final). The Alumnae Meet is internal.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the America East sponsors tennis but no football (CAA), hockey (Hockey East), wrestling, rowing, golf or gymnastics.
- Shared America East rules (`tests/america-east-shared.mjs`): cross country places with their points ("2nd, 52 points", A and B teams), TFRRS pages from the meets a schedule links, bowling days merged and storyless bowling left out, alumnae meets internal.

Each rule has a check in `tests/njit-module.mjs` (generated page blocks) or `tests/america-east-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Fencing, Hockey, Lacrosse, Tennis, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (the eight schools, none failed).

## Open

- Hockey, fencing and men's volleyball leagues are not named.
- First live cards not yet observed.
