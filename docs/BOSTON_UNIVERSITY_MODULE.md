# Boston University school module

`src/schools/boston-university.mjs` reads goterriers.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Patriot League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Basketball, Cross Country, Field Hockey, Golf, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field.

## Rules

- Hockey plays in Hockey East (both teams, as the pages mark it). Rowing names no league for the men's team. Golf is women's only.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Patriot League (2026-27: American, Army, Boston University, Bucknell, Colgate, Holy Cross, Lafayette, Lehigh, Loyola Maryland, Navy) sponsors football, basketball, baseball, softball, soccer, volleyball, field hockey, lacrosse, golf, tennis, cross country, track, swimming and women's rowing, but no wrestling, hockey, gymnastics, rifle, water polo or fencing (modules name those leagues); the members' pages mark their league games, football-only members included.

Each rule has a check in `tests/boston-university-module.mjs` (generated page blocks) or `tests/patriot-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 24).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Basketball, Cross Country, Field Hockey, Golf, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Rowing, Softball, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
