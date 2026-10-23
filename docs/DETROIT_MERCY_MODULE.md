# Detroit Mercy school module

`src/schools/detroit-mercy.mjs` reads detroittitans.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Horizon League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (8): Basketball, Cross Country, Fencing, Golf, Lacrosse, Soccer, Softball, Track & Field.

## Rules

- Lacrosse leagues are named per team page: men's in the NEC, women's in the MAC. Fencing names no league; a championship listed once per day is one meet. Women's golf's Midwest Match Play (Aug 30-31) reads "Completed": its story publishes no place ("ended the two-day event with a loss to UIC"). Tennis (2018-19), volleyball and baseball are past programs or redirects and are not listed.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Horizon League (2026-27, with Northern Illinois from the MAC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, lacrosse, wrestling, hockey or rowing.
- Shared Horizon League rules (`tests/horizon-shared.mjs`): bowling places with the record first, leagues named per team page (lacrosse, volleyball).

Each rule has a check in `tests/detroit-mercy-module.mjs` (generated page blocks) or `tests/horizon-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Fencing fills when its 2026-27 season is published.
- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
