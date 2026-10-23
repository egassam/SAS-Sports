# UNC Asheville school module

`src/schools/unc-asheville.mjs` reads uncabulldogs.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Big South (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Golf, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Swimming plays in the CCSA, as the page marks it. Opendorse marketplace `unca-bulldogs` is linked from the official site.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Big South sponsors lacrosse (Wofford, Mercer and Furman count as outside members) but no football (the Big South-OVC association), swimming, wrestling, field hockey or rowing.
- Shared Big South rules (`tests/big-south-shared.mjs`): golf results blocks ("Place (Winthrop): 16th"), individuals-only golf events ("had three individuals compete"), General Schedule pages are never a team's, Big South lacrosse affiliates.

Each rule has a check in `tests/unc-asheville-module.mjs` (generated page blocks) or `tests/big-south-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: Opendorse (`unca-bulldogs`). Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
