# Miami (OH) school module

`src/schools/miami-oh.mjs` reads miamiredhawks.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Hockey, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Cross country is on the track page ("Track & Field, Cross Country"): the fall meets (August-November) are cross country, the rest track (Coastal Carolina's rule); TFRRS `OH_college_f_Miami_OH` / `OH_college_m_Miami_OH`.
- The name has brackets: code patterns name "Miami", "Miami (OH)", "Miami (Ohio)", "RedHawks" (the port had written "Miami (OH)" raw).
- Hockey plays in the NCHC: no MAC record. Synchronized skating is not a catalog sport.
- Football's "MAC Championship" (neutral, Dec 5) reads "at".
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/miami-oh-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Football, Golf, Tennis, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Track & Field, Baseball and Softball fill when published.
- First live cards not yet observed.
