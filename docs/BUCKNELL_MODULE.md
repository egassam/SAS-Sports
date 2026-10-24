# Bucknell school module

`src/schools/bucknell.mjs` reads bucknellbison.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Patriot League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (16): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo, Wrestling.

## Rules

- Wrestling plays in the EIWA, men's water polo in the MAWPC and women's in the CWPA (named per team page). Rowing reads the men's crew and women's rowing pages. Water polo's Division III mark is dropped ("#4 (DIII) Occidental" reads "Occidental"). Cross country's home dual with Lafayette (Sep 5) reads "vs" with TFRRS team places. Women's water polo's 2026 record is the finished spring season.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Patriot League (2026-27: American, Army, Boston University, Bucknell, Colgate, Holy Cross, Lafayette, Lehigh, Loyola Maryland, Navy) sponsors football, basketball, baseball, softball, soccer, volleyball, field hockey, lacrosse, golf, tennis, cross country, track, swimming and women's rowing, but no wrestling, hockey, gymnastics, rifle, water polo or fencing (modules name those leagues); the members' pages mark their league games, football-only members included.

Each rule has a check in `tests/bucknell-module.mjs` (generated page blocks) or `tests/patriot-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 24) except the finished spring women's water polo season.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Golf, Lacrosse, Rowing, Softball, Swimming & Diving, Tennis, Volleyball, Water Polo, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Baseball, Lacrosse, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
