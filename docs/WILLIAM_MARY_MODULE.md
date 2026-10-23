# William & Mary school module

`src/schools/william-mary.mjs` reads tribeathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the CAA (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Gymnastics, Lacrosse, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Football plays in the Patriot League (its page data marks the Patriot League games), as Richmond's; gymnastics names no league. TFRRS reads `William__Mary`.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the CAA sponsors football (football-only members count from the page's own marks) and lacrosse, with Fairfield a member in field hockey and men's lacrosse; it sponsors no wrestling, gymnastics, bowling, beach volleyball, equestrian or triathlon.
- Shared CAA rules (`tests/caa-shared.mjs`): golf stories ("to lead the ... team to a seventh-place finish"), weekly honor stories never a meet's, TFRRS's shortened team names matched at onboarding, TFRRS meet names for host-named meets only where a module asks.

Each rule has a check in `tests/william-mary-module.mjs` (generated page blocks) or `tests/caa-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Basketball, Cross Country, Field Hockey, Football, Golf, Gymnastics, Lacrosse, Soccer, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Gymnastics' league is not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
