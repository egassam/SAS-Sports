# Southern Illinois school module

`src/schools/southern-illinois.mjs` reads siusalukis.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Missouri Valley (ported from Richmond's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball.

## Rules

- Football plays in the Missouri Valley Football Conference. Men's golf's Oct 12-13 tournament, named by its host ("Purdue University"), reads as the Purdue Fall Invitational (its story).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Shared Missouri Valley rules (`tests/missouri-valley-shared.mjs`): golf duals told by their story, bowling places with a match record, classic tournament headers cut at " | ", splash pages without the splash link; the Missouri Valley sponsors no football, gymnastics, wrestling, rifle, bowling, beach volleyball, rowing or STUNT.

Each rule has a check in `tests/southern-illinois-module.mjs` (generated page blocks) or `tests/missouri-valley-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23 (84 checks for the eight schools, none failed).

## Open

- Spring seasons fill when published.
- First live cards not yet observed.
