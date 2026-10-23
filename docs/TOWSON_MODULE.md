# Towson school module

`src/schools/towson.mjs` reads towsontigers.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the CAA (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (14): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Gymnastics, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Soccer is women's only (the men's page is a past program). Gymnastics plays in the EAGL, as the page marks it. Baseball's 2026 roster lists coaches only (Oct 23), so baseball is off the athlete list until players are published.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the CAA sponsors football (football-only members count from the page's own marks) and lacrosse, with Fairfield a member in field hockey and men's lacrosse; it sponsors no wrestling, gymnastics, bowling, beach volleyball, equestrian or triathlon.
- Shared CAA rules (`tests/caa-shared.mjs`): golf stories ("to lead the ... team to a seventh-place finish"), weekly honor stories never a meet's, TFRRS's shortened team names matched at onboarding, TFRRS meet names for host-named meets only where a module asks.

Each rule has a check in `tests/towson-module.mjs` (generated page blocks) or `tests/caa-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Cross Country, Field Hockey, Football, Golf, Gymnastics, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Baseball athletes return when its roster lists players.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
