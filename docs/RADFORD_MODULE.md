# Radford school module

`src/schools/radford.mjs` reads radfordathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Big South (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Field Hockey, Golf, Lacrosse, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Track reads the team pages; swimming (latest page 2013-14) and tennis (2024-25) are not listed. Field hockey's page is SIDEARM's empty template (a valid empty schedule) and names no league. Women's soccer's Sep 19 USC Upstate game is a "Declared Conference Forfeit" (page type X): the page counts it in its conference record (4-3) but not its overall (6-7-1); the app counts it in both (6-8-1).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Big South sponsors lacrosse (Wofford, Mercer and Furman count as outside members) but no football (the Big South-OVC association), swimming, wrestling, field hockey or rowing.
- Shared Big South rules (`tests/big-south-shared.mjs`): golf results blocks ("Place (Winthrop): 16th"), individuals-only golf events ("had three individuals compete"), General Schedule pages are never a team's, Big South lacrosse affiliates.

Each rule has a check in `tests/radford-module.mjs` (generated page blocks) or `tests/big-south-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23) except the women's soccer forfeit noted above.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Cross Country, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Field hockey fills when published; its league is not named.
- First live cards not yet observed.
