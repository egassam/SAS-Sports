# Eastern Michigan school module

`src/schools/eastern-michigan.mjs` reads emueagles.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Football, Golf, Gymnastics, Lacrosse, Rowing, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Scored swimming duals inside a meet keep their opponents (Eastern Classic, Oct 16-17: Toledo, Aquinas, Wayne State).
- Football's "MAC Championship" (neutral, Dec 5) reads "at".
- Golf cards publish "T-5th (830/-34)" and "1st (863, -1)" (shared `golfCardPlace`).
- INFLCR Exchange (`eastern-michigan-university`) for athlete Instagram.
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/eastern-michigan-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`eastern-michigan-university`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Cross Country, Gymnastics, Rowing, Swimming & Diving, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Track & Field, Rowing, Lacrosse and Baseball fill when published.
- First live cards not yet observed.
