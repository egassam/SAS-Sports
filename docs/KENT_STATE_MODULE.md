# Kent State school module

`src/schools/kent-state.mjs` reads kentstatesports.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Gymnastics, Lacrosse, Soccer, Softball, Track & Field, Volleyball, Wrestling.

## Rules

- Track & Field reads the team pages (`womens-`/`mens-track-and-field`); the generic page is the 2013-14 schedule.
- Women's wrestling (`/sports/wwrestling`) is an empty template: not in the app yet.
- Golf cards publish "T-12th / 13 teams (+61, 913)" (shared `golfCardPlace`).
- Opendorse marketplace (`kentstate-goldenflashes`) for athlete Instagram.
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/kent-state-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

Opendorse (`kentstate-goldenflashes`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Cross Country, Field Hockey, Soccer, Softball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Track & Field, Gymnastics, Lacrosse, Baseball and Softball fill when published.
- First live cards not yet observed.
