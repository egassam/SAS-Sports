# Southern Indiana school module

`src/schools/southern-indiana.mjs` reads usiscreamingeagles.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the OVC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Swimming names no league. Routes are the gendered team pages (the generic addresses are a 2011-12 page). A meet run in races reads its first race with the others in brackets ("38th of 44 (Blue Race; 3rd of 16 in White Race)", the Pre-National). The golf dual with Evansville (Battle of the Expressway) is read from its story as match play.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the OVC (2026-27: Eastern Illinois, Lindenwood, Morehead State, SIUE, Southeast Missouri, Southern Indiana, Tennessee State, Tennessee Tech, UT Martin, Western Illinois; Little Rock left for the UAC) sponsors football (the Big South-OVC association, whose Charleston Southern and Gardner-Webb games the members' pages mark), basketball, baseball, softball, soccer, volleyball, beach volleyball, golf, tennis, cross country, track and rifle, but no swimming, wrestling, hockey, lacrosse, gymnastics or bowling.

Each rule has a check in `tests/southern-indiana-module.mjs` (generated page blocks) or `tests/ovc-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Baseball, Softball, Track & Field fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
