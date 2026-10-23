# Wright State school module

`src/schools/wright-state.mjs` reads wsuraiders.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Horizon League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (8): Baseball, Basketball, Bowling, Cross Country, Golf, Soccer, Track & Field, Volleyball.

## Rules

- Bowling names no league. Women's soccer at Oakland (Oct 22, W 1-0) is in the app from the live scoreboard before the page posts it, so the app's record is one win ahead of the page's (Oct 23). Tennis (2019-20) and softball (2020) are past programs.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Horizon League (2026-27, with Northern Illinois from the MAC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, lacrosse, wrestling, hockey or rowing.
- Shared Horizon League rules (`tests/horizon-shared.mjs`): bowling places with the record first, leagues named per team page (lacrosse, volleyball).

Each rule has a check in `tests/wright-state-module.mjs` (generated page blocks) or `tests/horizon-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23) except the soccer game noted above.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Golf, Soccer, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
