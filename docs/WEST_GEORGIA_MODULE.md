# West Georgia school module

`src/schools/west-georgia.mjs` reads uwgathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the UAC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Tennis is not listed: its latest season is 2024 (no later schedule or roster).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the UAC (2026-27, Austin Peay's volleyball conference games and Central Arkansas's golf stories) sponsors football and counts West Florida's football; its beach volleyball and lacrosse are not confirmed, so they show no conference record.
- Shared ASUN/UAC rules (`tests/asun-shared.mjs`): story archives filled in the browser fall back to the sport's home page, the older story template's text, weekly award stories are never a meet's, "Intercollegiate" is a meet word, golf stories ("ended the tournament in", "the final round in", standings going into the final round skipped, the team winning the tournament).

Each rule has a check in `tests/west-georgia-module.mjs` (generated page blocks) or `tests/asun-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Golf (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (150 checks for the fourteen schools, none failed).

## Open

- Spring seasons fill when published.
- First live cards not yet observed.
