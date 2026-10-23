# Indiana State school module

`src/schools/indiana-state.mjs` reads gosycamores.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Missouri Valley (ported from Richmond's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball.

## Rules

- Football plays in the Missouri Valley Football Conference. The menu lists women's golf, soccer, swimming and volleyball only; the generic addresses (`soccer`, `volleyball`, `basketball`) are SIDEARM's "General Schedule" and were dropped. Indiana State hosts Pre-Nationals (Terre Haute).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Shared Missouri Valley rules (`tests/missouri-valley-shared.mjs`): golf duals told by their story, bowling places with a match record, classic tournament headers cut at " | ", splash pages without the splash link; the Missouri Valley sponsors no football, gymnastics, wrestling, rifle, bowling, beach volleyball, rowing or STUNT.

Each rule has a check in `tests/indiana-state-module.mjs` (generated page blocks) or `tests/missouri-valley-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Swimming & Diving (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (84 checks for the eight schools, none failed).

## Open

- Baseball's 2027 roster lists coaches only (Oct 23): Baseball is off the athlete list until players are published.
- First live cards not yet observed.
