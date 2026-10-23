# Princeton school module

`src/schools/princeton.mjs` reads goprincetontigers.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Ivy League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (18): Baseball, Basketball, Cross Country, Fencing, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo, Wrestling.

## Rules

- Hockey plays in ECAC Hockey and water polo in the CWPA, as the pages mark them. Volleyball reads both teams; men's volleyball (2026) and women's water polo (2026) records are the finished spring seasons, which the season rule leaves out. Rowing reads the women's open page (the past 2026 season) and heavyweight rowing; the lightweight pages (`mlr`, `wlr`) are 2025-26.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Ivy League sponsors nearly every sport, wrestling (its pages mark the Ivy duals), fencing, field hockey, lacrosse and rowing among them; hockey is ECAC Hockey's; it sponsors no equestrian, skiing or water polo. Squash, sailing, polo, rugby, sprint football and archery are not sports the app lists.
- Shared Ivy League rules (`tests/ivy-shared.mjs`): rankings without a number, rowing boat places, rowing team labels, the Big 5 Classic an event.

Each rule has a check in `tests/princeton-module.mjs` (generated page blocks) or `tests/ivy-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23) except the finished spring seasons noted above.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Cross Country, Fencing, Field Hockey, Golf, Hockey, Lacrosse, Rowing, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Men's volleyball, women's water polo and women's rowing fill when their next seasons are published.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
