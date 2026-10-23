# Southeast Missouri school module

`src/schools/southeast-missouri.mjs` reads semoredhawks.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the OVC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Football, Golf, Gymnastics, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Gymnastics names no league. Golf is men's only (the site's menu); its schedule and roster pages are SIDEARM's empty template, so golf reads empty and is off the athlete list until they are published. Volleyball reads the women's page (the generic address is the 2022 season). Bradley's cross country meet (Oct 16) is the Bradley Pink Classic (TFRRS; SEMO ran unscored there).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the OVC (2026-27: Eastern Illinois, Lindenwood, Morehead State, SIUE, Southeast Missouri, Southern Indiana, Tennessee State, Tennessee Tech, UT Martin, Western Illinois; Little Rock left for the UAC) sponsors football (the Big South-OVC association, whose Charleston Southern and Gardner-Webb games the members' pages mark), basketball, baseball, softball, soccer, volleyball, beach volleyball, golf, tennis, cross country, track and rifle, but no swimming, wrestling, hockey, lacrosse, gymnastics or bowling.

Each rule has a check in `tests/southeast-missouri-module.mjs` (generated page blocks) or `tests/ovc-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Football, Gymnastics, Soccer, Softball, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Golf, Gymnastics, Softball fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
