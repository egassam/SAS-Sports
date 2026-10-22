# Buffalo school module

`src/schools/buffalo.mjs` reads ubbulls.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Basketball, Cross Country, Football, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball, Wrestling.

## Rules

- Swimming reads `/sports/swimming-and-diving` (2026-27); the women's page is the 2025-26 schedule. A double dual's unscored half (Cornell, "Not Scored") reads "Completed" with the meet's story.
- Swimming's "UB Training Trip" (Dec 28-Jan 4) is no meet.
- Baseball, men's swimming and rowing are not in the site's menu: not in the app.
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/buffalo-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Soccer, Softball, Swimming & Diving, Tennis, Volleyball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Softball fills when published.
- First live cards not yet observed.
