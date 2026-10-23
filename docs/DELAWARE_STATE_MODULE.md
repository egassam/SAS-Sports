# Delaware State school module

`src/schools/delaware-state.mjs` reads dsuhornets.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the MEAC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (14): Baseball, Basketball, Bowling, Cross Country, Equestrian, Football, Golf, Lacrosse, Soccer, Softball, Tennis, Triathlon, Volleyball, Wrestling.

## Rules

- Baseball and women's lacrosse play in the NEC, as the pages mark them. Women's soccer plays in the NEC too, but its page marks no league games: the app counts its NEC opponents (`NEC_SOCCER`; 0-7 on the page, Oct 23), which the MEAC's membership would not count. Equestrian, triathlon and women's wrestling name no league.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the MEAC sponsors football, basketball, softball, volleyball, women's soccer, bowling, tennis, cross country and track, but no baseball (its members play in the NEC, as their pages mark it), lacrosse, swimming, wrestling, hockey, rowing or field hockey.
- Shared MEAC rules (`tests/meac-shared.mjs`): NEC baseball, a site's www host, story headlines in result lines, teams that did not race.

Each rule has a check in `tests/delaware-state-module.mjs` (generated page blocks) or `tests/meac-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Equestrian, Football, Golf, Lacrosse, Soccer, Softball, Tennis, Triathlon, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Equestrian, triathlon and wrestling leagues are not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
