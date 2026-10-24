# Tennessee State school module

`src/schools/tennessee-state.mjs` reads tsutigers.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the OVC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Basketball, Cross Country, Football, Golf, Hockey, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Hockey (men's, new for 2026-27) names no league; its schedule and roster are not yet published, so it reads empty and is off the athlete list. Cross country meets name their host after a bar ("Legacy Series Invite | Alabama A&M", cut at the bar). The golf rosters publish portraits for few golfers, so profiles without one fill the slots.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the OVC (2026-27: Eastern Illinois, Lindenwood, Morehead State, SIUE, Southeast Missouri, Southern Indiana, Tennessee State, Tennessee Tech, UT Martin, Western Illinois; Little Rock left for the UAC) sponsors football (the Big South-OVC association, whose Charleston Southern and Gardner-Webb games the members' pages mark), basketball, baseball, softball, soccer, volleyball, beach volleyball, golf, tennis, cross country, track and rifle, but no swimming, wrestling, hockey, lacrosse, gymnastics or bowling.

Each rule has a check in `tests/tennessee-state-module.mjs` (generated page blocks) or `tests/ovc-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Golf, Softball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Hockey, Softball, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
