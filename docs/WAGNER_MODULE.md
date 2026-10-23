# Wagner school module

`src/schools/wagner.mjs` reads wagnerathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the NEC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (15): Baseball, Basketball, Bowling, Cross Country, Fencing, Field Hockey, Football, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Triathlon.

## Rules

- Fencing and triathlon name no league. The 2027 baseball roster lists no players, so baseball is off the athlete list until it does; the bowling roster publishes portraits for few bowlers, so profiles without one fill the slots.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the NEC (2026-27; Saint Francis left for Division III) sponsors football, basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track, swimming, lacrosse, field hockey and bowling, but no hockey, wrestling or rowing. Its outside members count in its records (`AFFILIATES` in `src/conference-games.mjs`): football Duquesne, Robert Morris, Merrimack; field hockey Merrimack, Quinnipiac, Rider, Sacred Heart; soccer Howard and Delaware State; baseball Coppin State, Delaware State, UMES, Norfolk State; women's lacrosse Delaware State; bowling Niagara, Sacred Heart.
- Shared NEC rules (`tests/nec-shared.mjs`): cross country place forms, host names after a bar, outside members in the records.

Each rule has a check in `tests/wagner-module.mjs` (generated page blocks) or `tests/nec-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Basketball, Bowling, Cross Country, Fencing, Field Hockey, Football, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Triathlon (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Baseball athletes return when its roster lists players.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
