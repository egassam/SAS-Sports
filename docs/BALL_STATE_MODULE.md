# Ball State school module

`src/schools/ball-state.mjs` reads ballstatesports.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Gymnastics, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Golf cards publish "14th of 16 Teams / 928 (+64)": read by the shared `golfCardPlace`.
- Promotion names after the opponent ("Indiana (Alumni Game)", "(Breast Cancer Awareness Game)") are not part of it.
- A game played after its postponement keeps the old "Postponed" note beside its score (soccer vs IU Indy, Aug 13): the score decides, so the record is 6-5-4 as published.
- Cross country is women's only (TFRRS `IN_college_f_Ball_State`).
- Men's volleyball's page is the 2026 (spring) season; it fills when 2027 is published (Volleyball reads the women's page).
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/ball-state-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

No NIL marketplace linked; roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Field Hockey, Golf, Gymnastics, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Track & Field, Gymnastics, Baseball, Softball and men's Volleyball fill when published.
- First live cards not yet observed.
