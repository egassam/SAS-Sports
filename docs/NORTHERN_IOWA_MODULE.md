# Northern Iowa school module

`src/schools/northern-iowa.mjs` reads unipanthers.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Missouri Valley (ported from Richmond's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Football plays in the Missouri Valley Football Conference, wrestling in the Big 12. The USATF national championships (an open meet for individuals, Jul 23-26, no result or story) are left out. Opendorse marketplace `uni-panthers` (team "UNI Panthers") is linked from the official site.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Shared Missouri Valley rules (`tests/missouri-valley-shared.mjs`): golf duals told by their story, bowling places with a match record, classic tournament headers cut at " | ", splash pages without the splash link; the Missouri Valley sponsors no football, gymnastics, wrestling, rifle, bowling, beach volleyball, rowing or STUNT.

Each rule has a check in `tests/northern-iowa-module.mjs` (generated page blocks) or `tests/missouri-valley-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: Opendorse (`uni-panthers`). Profile cards fill the remaining slots in Golf, Softball, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (84 checks for the eight schools, none failed).

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
