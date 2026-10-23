# Mercyhurst school module

`src/schools/mercyhurst.mjs` reads hurstathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the NEC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (18): Baseball, Basketball, Bowling, Cross Country, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, STUNT, Soccer, Softball, Tennis, Track & Field, Volleyball, Water Polo, Wrestling.

## Rules

- Women's hockey plays in Atlantic Hockey America and STUNT in the MAWC, as the pages mark them; men's hockey is discontinued (its 2025-26 page says so), so hockey is women's only. Rowing reads the women's and men's lightweight pages, and wrestling the men's and women's (labelled). Water polo and wrestling name no league. Women's golf's "at Youngstown State" (Oct 4) is a match-play dual. The bowling roster publishes no portraits, so profiles without one fill the slots.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the NEC (2026-27; Saint Francis left for Division III) sponsors football, basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track, swimming, lacrosse, field hockey and bowling, but no hockey, wrestling or rowing. Its outside members count in its records (`AFFILIATES` in `src/conference-games.mjs`): football Duquesne, Robert Morris, Merrimack; field hockey Merrimack, Quinnipiac, Rider, Sacred Heart; soccer Howard and Delaware State; baseball Coppin State, Delaware State, UMES, Norfolk State; women's lacrosse Delaware State; bowling Niagara, Sacred Heart.
- Shared NEC rules (`tests/nec-shared.mjs`): cross country place forms, host names after a bar, outside members in the records.

Each rule has a check in `tests/mercyhurst-module.mjs` (generated page blocks) or `tests/nec-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23) except the finished spring water polo season.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, STUNT, Soccer, Softball, Tennis, Track & Field, Volleyball, Water Polo, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Water polo fills when its 2027 season is published.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
