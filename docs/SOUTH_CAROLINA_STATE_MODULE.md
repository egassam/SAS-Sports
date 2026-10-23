# South Carolina State school module

`src/schools/south-carolina-state.mjs` reads scsuathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the MEAC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Every South Carolina State sport is a MEAC sport. The site answers from www.scsuathletics.com, which the shared reader treats as the same site. Golf is women's only (the men's page is 2009). Track reads the women's (2025) and men's (2026-27) schedules; its roster is the women's (the men's answers 404). The basketball rosters publish no player portraits, so profiles without one fill the slots.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the MEAC sponsors football, basketball, softball, volleyball, women's soccer, bowling, tennis, cross country and track, but no baseball (its members play in the NEC, as their pages mark it), lacrosse, swimming, wrestling, hockey, rowing or field hockey.
- Shared MEAC rules (`tests/meac-shared.mjs`): NEC baseball, a site's www host, story headlines in result lines, teams that did not race.

Each rule has a check in `tests/south-carolina-state-module.mjs` (generated page blocks) or `tests/meac-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: INFLCR (`south-carolina-state-university`). Profile cards fill the remaining slots in Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Women's track fills when its 2027 season is published.
- First live cards not yet observed.
