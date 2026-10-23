# Northern Illinois school module

`src/schools/northern-illinois.mjs` reads niuhuskies.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the Horizon League (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Football, Golf, Gymnastics, Soccer, Softball, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Joined the Horizon League from the MAC in 2026-27 (Horizon members' pages mark it a league opponent). Football plays in the Mountain West and wrestling in the Pac-12, as the pages mark them; gymnastics' 2026 page marks MAC meets and its 2027 league is not published. Women's golf's Sep 13-14 tournament, named by its host ("Illinois State"), reads as the Redbird Invitational (its story).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Horizon League (2026-27, with Northern Illinois from the MAC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, lacrosse, wrestling, hockey or rowing.
- Shared Horizon League rules (`tests/horizon-shared.mjs`): bowling places with the record first, leagues named per team page (lacrosse, volleyball).

Each rule has a check in `tests/northern-illinois-module.mjs` (generated page blocks) or `tests/horizon-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles, then the NIL marketplace linked from the official site: Opendorse (`niu-huskies`). Profile cards fill the remaining slots in Baseball, Cross Country, Football, Golf, Gymnastics, Soccer, Softball, Tennis, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Gymnastics fills when its 2027 season is published; its league is not named.
- Spring seasons fill when published.
- First live cards not yet observed.
