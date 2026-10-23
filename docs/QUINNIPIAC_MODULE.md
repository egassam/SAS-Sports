# Quinnipiac school module

`src/schools/quinnipiac.mjs` reads gobobcats.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Metro Conference (the MAAC; ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Acrobatics & Tumbling, Baseball, Basketball, Cross Country, Field Hockey, Golf, Hockey, Lacrosse, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Hockey plays in ECAC Hockey and field hockey in the NEC, as the pages mark them; acrobatics and tumbling names no league. Track is women's only (the men's pages are SIDEARM's "@season" template).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Metro Conference (the MAAC's name from 2026-27, as its members' pages mark it; last spring's pages still say "MAAC") sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track, swimming, lacrosse, rowing and women's water polo, but no football, field hockey, wrestling, hockey, fencing or gymnastics.
- Shared Metro rules (`tests/metro-shared.mjs`): the league's current name, its "Metro ..." tournaments as events, a bare "PRESEASON" promotion as an exhibition, leagues named per team page.

Each rule has a check in `tests/quinnipiac-module.mjs` (generated page blocks) or `tests/metro-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23); spring 2026 records (men's volleyball, women's water polo) are finished seasons, which the season rule leaves out.

## Athletes

Roster cards, then official profiles. Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Acrobatics and tumbling's league is not named.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
