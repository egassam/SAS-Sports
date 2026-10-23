# Siena school module

`src/schools/siena.mjs` reads sienasaints.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Metro Conference (the MAAC; ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Acrobatics & Tumbling, Baseball, Basketball, Cross Country, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Volleyball, Water Polo.

## Rules

- Lacrosse reads the team pages (the generic address is the homepage). Acrobatics and tumbling's season is not published: its address answers with the homepage, read as an empty schedule until a season page appears (North Alabama's rule); its roster answers 404, so it is off the athlete list. Women's water polo's 2026 record is the past spring season.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Metro Conference (the MAAC's name from 2026-27, as its members' pages mark it; last spring's pages still say "MAAC") sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track, swimming, lacrosse, rowing and women's water polo, but no football, field hockey, wrestling, hockey, fencing or gymnastics.
- Shared Metro rules (`tests/metro-shared.mjs`): the league's current name, its "Metro ..." tournaments as events, a bare "PRESEASON" promotion as an exhibition, leagues named per team page.

Each rule has a check in `tests/siena-module.mjs` (generated page blocks) or `tests/metro-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23); spring 2026 records (men's volleyball, women's water polo) are finished seasons, which the season rule leaves out.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Volleyball, Water Polo (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Acrobatics and tumbling fills when its season is published.
- Water polo fills when its 2027 season is published.
- First live cards not yet observed.
