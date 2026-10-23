# Rider school module

`src/schools/rider.mjs` reads gobroncs.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Metro Conference (the MAAC; ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Field hockey plays in the NEC and wrestling in the MAC, as the pages mark them.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Metro Conference (the MAAC's name from 2026-27, as its members' pages mark it; last spring's pages still say "MAAC") sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track, swimming, lacrosse, rowing and women's water polo, but no football, field hockey, wrestling, hockey, fencing or gymnastics.
- Shared Metro rules (`tests/metro-shared.mjs`): the league's current name, its "Metro ..." tournaments as events, a bare "PRESEASON" promotion as an exhibition, leagues named per team page.

Each rule has a check in `tests/rider-module.mjs` (generated page blocks) or `tests/metro-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23); spring 2026 records (men's volleyball, women's water polo) are finished seasons, which the season rule leaves out.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Cross Country, Golf, Lacrosse, Softball, Swimming & Diving, Tennis, Track & Field, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
