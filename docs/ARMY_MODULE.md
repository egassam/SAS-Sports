# Army school module

`src/schools/army.mjs` reads goarmywestpoint.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Patriot League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (16): Baseball, Basketball, Cross Country, Football, Golf, Gymnastics, Hockey, Lacrosse, Rifle, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Football plays in the American, hockey in Atlantic Hockey America, rifle in the GARC, wrestling in the EIWA and gymnastics in the ECAC (as the pages mark them). Cross country reads the gendered pages (the generic address is the 2023 season); a dual whose score the page writes winner first ("L", 19-42, the men's Star Meet at Navy) is turned, since the lower score wins. Page-data type "X" is an exhibition (hockey's Royal Military College game, out of the record as on the page). The Army Invitational's unscored tennis sessions (Oct 3-4) read as one tournament. Golf's Commander-In-Chief's Cup reads 1st from its headline ("Golf Claims ...", shared `golfStoryPlace`). Sprint football and rugby are not app sports.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Patriot League (2026-27: American, Army, Boston University, Bucknell, Colgate, Holy Cross, Lafayette, Lehigh, Loyola Maryland, Navy) sponsors football, basketball, baseball, softball, soccer, volleyball, field hockey, lacrosse, golf, tennis, cross country, track, swimming and women's rowing, but no wrestling, hockey, gymnastics, rifle, water polo or fencing (modules name those leagues); the members' pages mark their league games, football-only members included.

Each rule has a check in `tests/army-module.mjs` (generated page blocks) or `tests/patriot-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 24).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Football, Golf, Gymnastics, Hockey, Lacrosse, Rifle, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Baseball, Gymnastics, Lacrosse, Softball, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
