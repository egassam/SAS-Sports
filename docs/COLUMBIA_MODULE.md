# Columbia school module

`src/schools/columbia.mjs` reads gocolumbialions.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Ivy League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (16): Baseball, Basketball, Cross Country, Fencing, Field Hockey, Football, Golf, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Rowing reads the women's and heavyweight pages (labelled "Men's Heavyweight"); lightweight rowing's page is the past 2026 season. Women's wrestling is SIDEARM's empty "@season" template and is not listed.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Ivy League sponsors nearly every sport, wrestling (its pages mark the Ivy duals), fencing, field hockey, lacrosse and rowing among them; hockey is ECAC Hockey's; it sponsors no equestrian, skiing or water polo. Squash, sailing, polo, rugby, sprint football and archery are not sports the app lists.
- Shared Ivy League rules (`tests/ivy-shared.mjs`): rankings without a number, rowing boat places, rowing team labels, the Big 5 Classic an event.

Each rule has a check in `tests/columbia-module.mjs` (generated page blocks) or `tests/ivy-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: Opendorse (`columbia-lions`). Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Fencing, Field Hockey, Golf, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Lightweight rowing fills when its 2026-27 season is published.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
