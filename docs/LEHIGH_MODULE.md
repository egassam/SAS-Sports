# Lehigh school module

`src/schools/lehigh.mjs` reads lehighsports.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Patriot League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (15): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Wrestling plays in the EIWA (as the page marks it). Hockey is a club team (ACHA) and is not listed. Swimming reads the gendered pages (the generic address is 2009-10). Rowing reads the men's page (the generic `rowing` address, labelled by `teamLabels`) and the women's.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Patriot League (2026-27: American, Army, Boston University, Bucknell, Colgate, Holy Cross, Lafayette, Lehigh, Loyola Maryland, Navy) sponsors football, basketball, baseball, softball, soccer, volleyball, field hockey, lacrosse, golf, tennis, cross country, track, swimming and women's rowing, but no wrestling, hockey, gymnastics, rifle, water polo or fencing (modules name those leagues); the members' pages mark their league games, football-only members included.

Each rule has a check in `tests/lehigh-module.mjs` (generated page blocks) or `tests/patriot-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 24).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Field Hockey, Golf, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Baseball, Lacrosse, Softball, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
