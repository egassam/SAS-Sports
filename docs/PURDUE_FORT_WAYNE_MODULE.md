# Purdue Fort Wayne school module

`src/schools/purdue-fort-wayne.mjs` reads gomastodons.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Horizon League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Volleyball reads both teams; men's volleyball plays in the MIVA (named on its own page). The men's 2026 season is past, so it fills when 2027 is published. Baseball, softball and women's tennis schedules and rosters are SIDEARM's empty "@season" template (valid empty schedules), so those sports are off the athlete list until published.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Horizon League (2026-27, with Northern Illinois from the MAC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, lacrosse, wrestling, hockey or rowing.
- Shared Horizon League rules (`tests/horizon-shared.mjs`): bowling places with the record first, leagues named per team page (lacrosse, volleyball).

Each rule has a check in `tests/purdue-fort-wayne-module.mjs` (generated page blocks) or `tests/horizon-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Men's volleyball fills when its 2027 season is published.
- Baseball, softball and tennis fill when published; their athletes return with their rosters.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
