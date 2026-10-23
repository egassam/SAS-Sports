# LIU school module

`src/schools/liu.mjs` reads liuathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the NEC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (21): Acrobatics & Tumbling, Baseball, Basketball, Bowling, Cross Country, Equestrian, Fencing, Field Hockey, Football, Golf, Gymnastics, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Water Polo.

## Rules

- Gymnastics plays in the EAGL, men's water polo in the NWPC and women's in the Metro Conference, and women's hockey in the NEWHA (named per team page). Men's hockey, equestrian, fencing and rowing name no league. The men's pages use short codes (`mrow`, `mswim`, `mten`, `mvb`, `mwpolo`), labelled by `teamLabels`. Women's water polo's 2026 record is the past spring season.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the NEC (2026-27; Saint Francis left for Division III) sponsors football, basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track, swimming, lacrosse, field hockey and bowling, but no hockey, wrestling or rowing. Its outside members count in its records (`AFFILIATES` in `src/conference-games.mjs`): football Duquesne, Robert Morris, Merrimack; field hockey Merrimack, Quinnipiac, Rider, Sacred Heart; soccer Howard and Delaware State; baseball Coppin State, Delaware State, UMES, Norfolk State; women's lacrosse Delaware State; bowling Niagara, Sacred Heart.
- Shared NEC rules (`tests/nec-shared.mjs`): cross country place forms, host names after a bar, outside members in the records.

Each rule has a check in `tests/liu-module.mjs` (generated page blocks) or `tests/nec-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23) except the finished spring water polo season.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Basketball, Bowling, Cross Country, Equestrian, Field Hockey, Gymnastics, Hockey, Lacrosse, Rowing, Tennis, Track & Field, Water Polo (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Water polo fills when its 2027 season is published.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
