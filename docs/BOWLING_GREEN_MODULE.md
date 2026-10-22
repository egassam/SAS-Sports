# Bowling Green school module

`src/schools/bowling-green.mjs` reads bgsufalcons.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Football, Golf, Gymnastics, Hockey, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Golf cards publish "T-5/12" (shared place reader).
- Hockey plays in the CCHA: the MAC sponsors none, so no MAC record.
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/bowling-green-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Tennis, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Baseball and Softball fill when published.
- First live cards not yet observed.
