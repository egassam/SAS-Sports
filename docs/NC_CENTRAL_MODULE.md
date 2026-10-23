# North Carolina Central school module

`src/schools/nc-central.mjs` reads nccueaglepride.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the MEAC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (8): Basketball, Cross Country, Football, Golf, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Every North Carolina Central sport is a MEAC sport. A story headline in a meet's result line ("Aaron Alukunyang Wins adidas Challenge, Stays Unbeaten", Sep 18) is no result: the meet keeps "Completed" and its story. Golf finals at the Elon Invitational, the Dortch HBCU Classic and the Ironwood Classic read "Completed": their stories publish individual results only. The 2027 softball roster lists no players, so softball is off the athlete list until it does.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the MEAC sponsors football, basketball, softball, volleyball, women's soccer, bowling, tennis, cross country and track, but no baseball (its members play in the NEC, as their pages mark it), lacrosse, swimming, wrestling, hockey, rowing or field hockey.
- Shared MEAC rules (`tests/meac-shared.mjs`): NEC baseball, a site's www host, story headlines in result lines, teams that did not race.

Each rule has a check in `tests/nc-central-module.mjs` (generated page blocks) or `tests/meac-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: INFLCR (`north-carolina-central-university`). Profile cards fill the remaining slots in Basketball, Cross Country, Football, Golf, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Softball athletes return when its roster lists players.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
