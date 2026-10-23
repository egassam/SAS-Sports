# Evansville school module

`src/schools/evansville.mjs` reads gopurpleaces.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Missouri Valley (ported from Richmond's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball.

## Rules

- Every Evansville sport is a Missouri Valley sport. Cross country reads the team pages (the generic address is the homepage). Golf's Battle of the Expressway with USI (Oct 22) is a match-play dual told by its story ("Match play: 0-1", "L, 4.5-9.5", one score for both teams).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Shared Missouri Valley rules (`tests/missouri-valley-shared.mjs`): golf duals told by their story, bowling places with a match record, classic tournament headers cut at " | ", splash pages without the splash link; the Missouri Valley sponsors no football, gymnastics, wrestling, rifle, bowling, beach volleyball, rowing or STUNT.

Each rule has a check in `tests/evansville-module.mjs` (generated page blocks) or `tests/missouri-valley-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (84 checks for the eight schools, none failed).

## Open

- Spring seasons fill when published.
- First live cards not yet observed.
