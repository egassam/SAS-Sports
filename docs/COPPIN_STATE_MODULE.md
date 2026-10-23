# Coppin State school module

`src/schools/coppin-state.mjs` reads coppinstatesports.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the MEAC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Bowling, Cross Country, Golf, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Baseball plays in the NEC, as the page marks it. Golf reads both team pages.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the MEAC sponsors football, basketball, softball, volleyball, women's soccer, bowling, tennis, cross country and track, but no baseball (its members play in the NEC, as their pages mark it), lacrosse, swimming, wrestling, hockey, rowing or field hockey.
- Shared MEAC rules (`tests/meac-shared.mjs`): NEC baseball, a site's www host, story headlines in result lines, teams that did not race.

Each rule has a check in `tests/coppin-state-module.mjs` (generated page blocks) or `tests/meac-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: INFLCR (`coppin-state-university`). Profile cards fill the remaining slots in Baseball, Bowling, Cross Country, Golf, Softball, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Spring seasons fill when published.
- First live cards not yet observed.
