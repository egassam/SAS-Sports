# Penn school module

`src/schools/penn.mjs` reads pennathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Ivy League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (17): Baseball, Basketball, Cross Country, Fencing, Field Hockey, Football, Golf, Gymnastics, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Gymnastics plays in the Gymnastics East Conference, as the page marks it. Rowing reads `womens-rowing`, `mens-rowing` (heavyweight) and `mens-crew` (lightweight), labelled by `teamLabels`. The Big 5 Classic and Championship are "at" events (Drexel's rule).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Ivy League sponsors nearly every sport, wrestling (its pages mark the Ivy duals), fencing, field hockey, lacrosse and rowing among them; hockey is ECAC Hockey's; it sponsors no equestrian, skiing or water polo. Squash, sailing, polo, rugby, sprint football and archery are not sports the app lists.
- Shared Ivy League rules (`tests/ivy-shared.mjs`): rankings without a number, rowing boat places, rowing team labels, the Big 5 Classic an event.

Each rule has a check in `tests/penn-module.mjs` (generated page blocks) or `tests/ivy-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: INFLCR (`university-of-pennsylvania`). Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Spring seasons fill when published.
- First live cards not yet observed.
