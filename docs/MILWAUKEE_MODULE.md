# Milwaukee school module

`src/schools/milwaukee.mjs` reads mkepanthers.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Horizon League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (8): Baseball, Basketball, Cross Country, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Every Milwaukee sport is a Horizon League sport. Golf, softball and men's tennis addresses answer with the site's ticket page (no programs).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Horizon League (2026-27, with Northern Illinois from the MAC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, lacrosse, wrestling, hockey or rowing.
- Shared Horizon League rules (`tests/horizon-shared.mjs`): bowling places with the record first, leagues named per team page (lacrosse, volleyball).

Each rule has a check in `tests/milwaukee-module.mjs` (generated page blocks) or `tests/horizon-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Tennis (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
