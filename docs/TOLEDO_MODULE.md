# Toledo school module

`src/schools/toledo.mjs` reads utrockets.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Football, Golf, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Golf cards put the score first ("864/T-2nd"): shared `golfCardPlace`.
- The weekly department roundup ("this-week-in-rocket-athletics") is no event's story (`skipStory`): men's tennis "Fall Competition" (Oct 9-11) has no story and is not listed.
- INFLCR Exchange (`university-of-toledo`).
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/toledo-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`university-of-toledo`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Three verified Instagram in every sport.

## Open

- Track & Field, Baseball and Softball fill when published.
- First live cards not yet observed.
