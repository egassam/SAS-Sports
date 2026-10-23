# Gardner-Webb school module

`src/schools/gardner-webb.mjs` reads gwusports.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Big South (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Football, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball, Wrestling.

## Rules

- Football plays in the Big South-OVC association, wrestling in the SoCon and men's swimming in the CCSA, as the page marks them. Acrobatics and flag football are not sports the app lists for Gardner-Webb.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Big South sponsors lacrosse (Wofford, Mercer and Furman count as outside members) but no football (the Big South-OVC association), swimming, wrestling, field hockey or rowing.
- Shared Big South rules (`tests/big-south-shared.mjs`): golf results blocks ("Place (Winthrop): 16th"), individuals-only golf events ("had three individuals compete"), General Schedule pages are never a team's, Big South lacrosse affiliates.

Each rule has a check in `tests/gardner-webb-module.mjs` (generated page blocks) or `tests/big-south-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Football, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
