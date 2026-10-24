# Loyola Maryland school module

`src/schools/loyola-maryland.mjs` reads loyolagreyhounds.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Patriot League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Basketball, Cross Country, Golf, Lacrosse, Rowing, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Every Loyola Maryland sport is a Patriot League sport. The Macdonald Cup (golf, Sep 25-26) was cut short by a nor'easter; its story tells it.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Patriot League (2026-27: American, Army, Boston University, Bucknell, Colgate, Holy Cross, Lafayette, Lehigh, Loyola Maryland, Navy) sponsors football, basketball, baseball, softball, soccer, volleyball, field hockey, lacrosse, golf, tennis, cross country, track, swimming and women's rowing, but no wrestling, hockey, gymnastics, rifle, water polo or fencing (modules name those leagues); the members' pages mark their league games, football-only members included.

Each rule has a check in `tests/loyola-maryland-module.mjs` (generated page blocks) or `tests/patriot-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 24).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Basketball, Cross Country, Golf, Rowing, Swimming & Diving, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Lacrosse, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
