# Sacred Heart school module

`src/schools/sacred-heart.mjs` reads sacredheartpioneers.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Metro Conference (the MAAC; ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (19): Baseball, Basketball, Bowling, Cross Country, Equestrian, Fencing, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Football plays in the CAA, field hockey and bowling in the NEC, men's hockey in Atlantic Hockey and women's in the NEWHA, wrestling in the EIWA and equestrian in the NCEA, as the pages mark them; fencing names no league. Rowing reads `womens-rowing` and `womens-lightweight-rowing` (labelled "Women's Lightweight"); wrestling reads `wrestling` and `wwrest` (labelled); volleyball reads both teams (men's 2026 is the past spring season). Bowling is women's only (`mens-bowling` is a 2020-21 women's page). Acrobatics' page is SIDEARM's "@season" template and is not listed. The baseball roster publishes portraits for few players, so profiles without one fill the slots.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Metro Conference (the MAAC's name from 2026-27, as its members' pages mark it; last spring's pages still say "MAAC") sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track, swimming, lacrosse, rowing and women's water polo, but no football, field hockey, wrestling, hockey, fencing or gymnastics.
- Shared Metro rules (`tests/metro-shared.mjs`): the league's current name, its "Metro ..." tournaments as events, a bare "PRESEASON" promotion as an exhibition, leagues named per team page.

Each rule has a check in `tests/sacred-heart-module.mjs` (generated page blocks) or `tests/metro-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23); spring 2026 records (men's volleyball, women's water polo) are finished seasons, which the season rule leaves out.

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: Opendorse (`sacred-heart-pioneers`). Profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Equestrian, Fencing, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Men's volleyball fills when its 2027 season is published.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
