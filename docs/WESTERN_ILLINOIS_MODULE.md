# Western Illinois school module

`src/schools/western-illinois.mjs` reads goleathernecks.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the OVC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Bowling names no league. Tennis is women's only (the men's page is 2015-16). Cross country meets named by their hosts take TFRRS's names (Huskie Classic, John McNichols Invitational, Joe Piane Notre Dame Invitational, Bradley Pink Classic: `hostMeetName`). The 2027 baseball and softball rosters publish no player portraits, so profiles without one fill the slots.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the OVC (2026-27: Eastern Illinois, Lindenwood, Morehead State, SIUE, Southeast Missouri, Southern Indiana, Tennessee State, Tennessee Tech, UT Martin, Western Illinois; Little Rock left for the UAC) sponsors football (the Big South-OVC association, whose Charleston Southern and Gardner-Webb games the members' pages mark), basketball, baseball, softball, soccer, volleyball, beach volleyball, golf, tennis, cross country, track and rifle, but no swimming, wrestling, hockey, lacrosse, gymnastics or bowling.

Each rule has a check in `tests/western-illinois-module.mjs` (generated page blocks) or `tests/ovc-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Baseball, Softball, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
