# Mercer school module

`src/schools/mercer.mjs` reads mercerbears.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Southern Conference (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Lacrosse, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Men's and women's lacrosse (no SoCon lacrosse: no conference record). Track is the women's page only.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Southern Conference (2026-27: Chattanooga, The Citadel, East Tennessee State, Furman, Mercer, Samford, UNC Greensboro, VMI, Western Carolina, Wofford) sponsors football, basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and wrestling, but no swimming, lacrosse, water polo or beach volleyball; the members' pages mark their league games.

Each rule has a check in `tests/mercer-module.mjs` (generated page blocks) or `tests/socon-shared.mjs`. Game-sport records on the preview equal each live page's own (`compare-records`, Oct 24).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Beach Volleyball, Soccer (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
