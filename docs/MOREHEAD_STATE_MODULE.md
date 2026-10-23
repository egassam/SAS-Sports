# Morehead State school module

`src/schools/morehead-state.mjs` reads msueagles.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the OVC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Rifle, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Football plays in the Pioneer Football League; its page marks no league games, so the module counts its PFL opponents (0-3, as the page states). The page writes a score winner first ("L", 3-0): the module turns it to the team's side. Volleyball's two "Exhibition Match" games (Aug 21-22) are exhibitions, out of the record as on the page. Rifle is an OVC sport. The 2027 baseball and beach volleyball rosters publish no player portraits, so profiles without one fill the slots.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the OVC (2026-27: Eastern Illinois, Lindenwood, Morehead State, SIUE, Southeast Missouri, Southern Indiana, Tennessee State, Tennessee Tech, UT Martin, Western Illinois; Little Rock left for the UAC) sponsors football (the Big South-OVC association, whose Charleston Southern and Gardner-Webb games the members' pages mark), basketball, baseball, softball, soccer, volleyball, beach volleyball, golf, tennis, cross country, track and rifle, but no swimming, wrestling, hockey, lacrosse, gymnastics or bowling.

Each rule has a check in `tests/morehead-state-module.mjs` (generated page blocks) or `tests/ovc-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Beach Volleyball, Football, Golf, Rifle, Softball, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Baseball, Beach Volleyball, Softball, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
