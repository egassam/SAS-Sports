# Lindenwood school module

`src/schools/lindenwood.mjs` reads lindenwoodlions.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the OVC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (14): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Hockey, Lacrosse, Soccer, Softball, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Men's volleyball plays in the MIVA, women's hockey in Atlantic Hockey America and women's lacrosse in the ASUN (named per team page); men's hockey (`mhockey-ncaa`, labelled by `teamLabels`) is independent, and women's wrestling names no league. Men's lacrosse, men's tennis, men's track and men's wrestling are discontinued (their pages say so): those sports are women's only. Men's volleyball's 2026 record is its finished spring season.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the OVC (2026-27: Eastern Illinois, Lindenwood, Morehead State, SIUE, Southeast Missouri, Southern Indiana, Tennessee State, Tennessee Tech, UT Martin, Western Illinois; Little Rock left for the UAC) sponsors football (the Big South-OVC association, whose Charleston Southern and Gardner-Webb games the members' pages mark), basketball, baseball, softball, soccer, volleyball, beach volleyball, golf, tennis, cross country, track and rifle, but no swimming, wrestling, hockey, lacrosse, gymnastics or bowling.

Each rule has a check in `tests/lindenwood-module.mjs` (generated page blocks) or `tests/ovc-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23) except the finished spring men's volleyball season.

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Football, Golf, Lacrosse, Soccer, Tennis, Track & Field, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23.

## Open

- Baseball, Beach Volleyball, Lacrosse fill when their 2026-27 seasons are published (the pages show the finished season or none).
- First live cards not yet observed.
