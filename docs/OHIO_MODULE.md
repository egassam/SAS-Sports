# Ohio school module

`src/schools/ohio.mjs` reads ohiobobcats.com (SIDEARM, read private source), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball, Wrestling.

## Rules

- The menu links each team by its code (`/sports/mbball`, `wcross`, `wgolf`, `fhockey`, `wswim`, `wtrack`); the generic pages are empty templates. Two-team sports are labeled by `teamLabels`.
- TFRRS `OH_college_f_Ohio_U` / `OH_college_m_Ohio_U`.
- Golf names carry the season's year ("2026 Rocket Classic"): left out. "Raider Individual" (Oct 12-13) is individuals only (the card repeats the team event's "12th"; Miami lists it "Individuals Only").
- Men's golf at the Indy at Forest Hills (Oct 2) reads "Completed" with its story: the card is empty and the story gives no team place (individual event).
- INFLCR Exchange (`ohio-university`).
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/ohio-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`ohio-university`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Profile cards fill the remaining slots in Baseball, Softball, Wrestling (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`).

## Open

- Track & Field, Baseball and Softball fill when published.
- First live cards not yet observed.
