# Cleveland State school module

`src/schools/cleveland-state.mjs` reads csuvikings.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Horizon League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Basketball, Cross Country, Fencing, Golf, Lacrosse, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Men's lacrosse plays in the NEC, as the page marks it; fencing names no league. Fencing meets read each team's record over the duals ("Men: 3-2 | Women: 3-2" reads "Women's team: 3-2 / Men's team: 3-2"). Golf is men's only (the women's page is 2024-25); cross country and track are women's only; the track roster publishes portraits for few athletes, so profiles without one fill the slots (`portraitlessProfileSports`). Wrestling's latest page is 2024-25 and it is not in the menu.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Horizon League (2026-27, with Northern Illinois from the MAC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, lacrosse, wrestling, hockey or rowing.
- Shared Horizon League rules (`tests/horizon-shared.mjs`): bowling places with the record first, leagues named per team page (lacrosse, volleyball).

Each rule has a check in `tests/cleveland-state-module.mjs` (generated page blocks) or `tests/horizon-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: INFLCR (`cleveland-state-university`). Profile cards fill the remaining slots in Basketball, Cross Country, Fencing, Golf, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
