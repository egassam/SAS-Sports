# Central Arkansas school module

`src/schools/central-arkansas.mjs` reads ucasports.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the UAC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, STUNT, Soccer, Softball, Track & Field, Volleyball.

## Rules

- Team pages for basketball, golf, soccer, volleyball, cross country and track (the generic addresses are SIDEARM's "General Schedule"); men's cross country is the unlabeled `cross-country` page (teamLabels). The story archive is filled by a service that refuses the app: stories come from the sport's home page and the older story template's text (golf places from every story). Beach volleyball reads `womens-beach-volleyball`; STUNT names no league; baseball profiles publish no portraits.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the UAC (2026-27, Austin Peay's volleyball conference games and Central Arkansas's golf stories) sponsors football and counts West Florida's football; its beach volleyball and lacrosse are not confirmed, so they show no conference record.
- Shared ASUN/UAC rules (`tests/asun-shared.mjs`): story archives filled in the browser fall back to the sport's home page, the older story template's text, weekly award stories are never a meet's, "Intercollegiate" is a meet word, golf stories ("ended the tournament in", "the final round in", standings going into the final round skipped, the team winning the tournament).

Each rule has a check in `tests/central-arkansas-module.mjs` (generated page blocks) or `tests/asun-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Profile cards fill the remaining slots in Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, STUNT, Soccer, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 23 (150 checks for the fourteen schools, none failed).

## Open

- Beach volleyball and STUNT leagues are not named.
- First live cards not yet observed.
