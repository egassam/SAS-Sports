# Robert Morris school module

`src/schools/robert-morris.mjs` reads rmucolonials.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Horizon League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Basketball, Cross Country, Football, Golf, Hockey, Lacrosse, Rowing, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Football and men's lacrosse play in the NEC, women's lacrosse in the MAC, both hockey teams in Atlantic Hockey, as the pages mark them; rowing names no league. Routes are the team pages (the generic `cross-country` page is 2024, `hockey`, `soccer` and `wrestling` answer with the homepage); golf is men's only and track women's only (the other pages are 2013-14).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Horizon League (2026-27, with Northern Illinois from the MAC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, lacrosse, wrestling, hockey or rowing.
- Shared Horizon League rules (`tests/horizon-shared.mjs`): bowling places with the record first, leagues named per team page (lacrosse, volleyball).

Each rule has a check in `tests/robert-morris-module.mjs` (generated page blocks) or `tests/horizon-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Rowing's league is not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
