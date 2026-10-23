# Bellarmine school module

`src/schools/bellarmine.mjs` reads athletics.bellarmine.edu (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the ASUN (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Field hockey plays in the MAC and wrestling in the SoCon, as the page marks them; men's lacrosse is an ASUN sport; swimming reads the `mens-swimming`/`womens-swimming` pages (the scaffold's address was the homepage) and names no league. Sprint football (`sprint-football`) is not a sport the app lists.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the ASUN sponsors no football, swimming, rowing, wrestling or gymnastics; its men's lacrosse counts Air Force, Utah and Mercer, its women's lacrosse Kennesaw State, Austin Peay, Lindenwood, Coastal Carolina, Delaware and Liberty.
- Shared ASUN/UAC rules (`tests/asun-shared.mjs`): story archives filled in the browser fall back to the sport's home page, the older story template's text, weekly award stories are never a meet's, "Intercollegiate" is a meet word, golf stories ("ended the tournament in", "the final round in", standings going into the final round skipped, the team winning the tournament).

Each rule has a check in `tests/bellarmine-module.mjs` (generated page blocks) or `tests/asun-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Field Hockey, Golf, Lacrosse, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (150 checks for the fourteen schools, none failed).

## Open

- Swimming's league is not named.
- First live cards not yet observed.
