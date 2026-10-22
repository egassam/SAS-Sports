# UMass school module

`src/schools/umass.mjs` reads umassathletics.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Football, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field.

## Rules

- The menu links teams as `index.aspx?path=<code>`: `add-school` now reads those (it first found three sports).
- Football is a full MAC member from 2025; Hockey plays in Hockey East, Rowing and men's Lacrosse in the A-10 (no MAC record).
- TFRRS `MA_college_f_UMass_Amherst` / `MA_college_m_UMass_Amherst`.
- Women's tennis tournaments have no stories: not listed (K-State's rule).
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/umass-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Field Hockey, Football, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Track & Field, Lacrosse, Baseball and Softball fill when published.
- First live cards not yet observed.
