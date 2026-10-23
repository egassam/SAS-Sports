# Belmont school module

`src/schools/belmont.mjs` reads belmontbruins.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Missouri Valley (ported from Richmond's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Golf, STUNT, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Belmont plays STUNT outside the Missouri Valley, in no league yet. The homepage is a 75th-anniversary landing page with no sport links (read as a splash page; the menu comes from a sport page). Cross country and track read the team pages (`mens-`/`womens-cross-country`, `mens-`/`womens-track-and-field`); the generic addresses answer with the homepage. STUNT (added Sept 2025, belmontbruins.com story) has no published season: its schedule address answers with the homepage, read as an empty schedule until a season page appears.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Shared Missouri Valley rules (`tests/missouri-valley-shared.mjs`): golf duals told by their story, bowling places with a match record, classic tournament headers cut at " | ", splash pages without the splash link; the Missouri Valley sponsors no football, gymnastics, wrestling, rifle, bowling, beach volleyball, rowing or STUNT.

Each rule has a check in `tests/belmont-module.mjs` (generated page blocks) or `tests/missouri-valley-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23 (84 checks for the eight schools, none failed).

## Open

- STUNT fills when its first season is published.
- Track & Field fills when the 2026-27 season is published (the 2025-26 pages are past).
- First live cards not yet observed.
