# Winthrop school module

`src/schools/winthrop.mjs` reads winthropeagles.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Big South (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Golf, Lacrosse, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Team pages for basketball, cross country, golf, soccer, track and volleyball (the generic addresses are a "2018 General Schedule"). Golf stories carry a results block ("Place (Winthrop): T-8th of 15"). The Terrier Intercollegiate (Oct 12-13) reads "Completed" with its story: the block says "1 of 12", which its own top five (ETSU first) contradicts. INFLCR marketplace `winthrop-university`.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Big South sponsors lacrosse (Wofford, Mercer and Furman count as outside members) but no football (the Big South-OVC association), swimming, wrestling, field hockey or rowing.
- Shared Big South rules (`tests/big-south-shared.mjs`): golf results blocks ("Place (Winthrop): 16th"), individuals-only golf events ("had three individuals compete"), General Schedule pages are never a team's, Big South lacrosse affiliates.

Each rule has a check in `tests/winthrop-module.mjs` (generated page blocks) or `tests/big-south-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace: INFLCR (`winthrop-university`). Profile cards fill the remaining slots in Basketball, Cross Country, Golf, Lacrosse, Soccer, Softball, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
