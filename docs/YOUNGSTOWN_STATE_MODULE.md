# Youngstown State school module

`src/schools/youngstown-state.mjs` reads ysusports.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Horizon League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Football plays in the Missouri Valley Football Conference and women's lacrosse in the MAC, as the pages mark them; bowling names no league. Cross country, track and swimming read the menu's `xc`, `track` and `swim` pages (the generic addresses are SIDEARM's "@season" template). Bowling days are grouped by the page's opponent record (the Nov 20 day of the Jersey Jamboree is titled "Jersey Jamboreee"). Bowling places carry the match record first ("1-2 / 4th of 18 Teams" reads "4th of 18 (1-2)").
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Horizon League (2026-27, with Northern Illinois from the MAC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, lacrosse, wrestling, hockey or rowing.
- Shared Horizon League rules (`tests/horizon-shared.mjs`): bowling places with the record first, leagues named per team page (lacrosse, volleyball).

Each rule has a check in `tests/youngstown-state-module.mjs` (generated page blocks) or `tests/horizon-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Football, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Bowling's league is not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
