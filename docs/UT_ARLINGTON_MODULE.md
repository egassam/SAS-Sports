# UT Arlington school module

`src/schools/ut-arlington.mjs` reads utamavs.com (SIDEARM, read through the private source), set up by `start-schools` on October 23, 2026 for the UAC (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (8): Baseball, Basketball, Cross Country, Golf, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Cross country reads TFRRS's `Texas_Arlington` team pages (onboarding now tries hyphenated aliases).
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the UAC (2026-27, Austin Peay's volleyball conference games and Central Arkansas's golf stories) sponsors football and counts West Florida's football; its beach volleyball and lacrosse are not confirmed, so they show no conference record.
- Shared ASUN/UAC rules (`tests/asun-shared.mjs`): story archives filled in the browser fall back to the sport's home page, the older story template's text, weekly award stories are never a meet's, "Intercollegiate" is a meet word, golf stories ("ended the tournament in", "the final round in", standings going into the final round skipped, the team winning the tournament).

Each rule has a check in `tests/ut-arlington-module.mjs` (generated page blocks) or `tests/asun-shared.mjs`. Game-sport records on the preview equal each live page's own (`npm run compare-records`, Oct 23).

## Athletes

Roster cards, then official profiles. Three athletes with verified Instagram in every listed sport. Checked with `validate-schools --athletes-only` on the preview, Oct 23 (150 checks for the fourteen schools, none failed).

## Open

- Track & Field fills when the 2026-27 season is published.
- First live cards not yet observed.
