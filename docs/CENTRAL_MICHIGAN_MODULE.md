# Central Michigan school module

`src/schools/central-michigan.mjs` reads cmuchippewas.com (SIDEARM, read directly), set up by `start-schools` on October 22, 2026 for the MAC (ported from Troy's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (13): Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Gymnastics, Lacrosse, Soccer, Softball, Track & Field, Volleyball, Wrestling.

## Rules

- Golf cards name the tournament as the opponent and its host as the tournament ("Rocket Classic" / "Toledo"): the tournament is the opponent; places "12th of 14, 289-291 -- 580 (+12)" read by the shared `golfCardPlace`.
- The Motor City Matchup's rounds are matches ("CMU 10, Alabama State 2"): one event, "Match play: 2-0".
- Track & Field is women's only (`/sports/womens-track-and-field`); the men's page is the 2019-20 schedule.
- Shared MAC rules (`tests/mac-shared.mjs`): golf card places beside the team's scores (`golfCardPlace`); the MAC sponsors no hockey, rowing or rifle (no MAC record in those); opponents "Miami (Ohio)", "Miami University (OH)", "Massachusetts" count as MAC members; a neutral "MAC Championship" reads "at"; promotion suffixes ("(Alumni Game)") and a leading season year leave names; scored swim duals inside a meet keep their opponents.

Each rule has a check in `tests/central-michigan-module.mjs` (generated page blocks plus hand checks) or `tests/mac-shared.mjs`; each new rule was mutated and its test failed.

## Athletes

INFLCR Exchange (`central-michigan-university`) after the roster cards and official profiles. Every sport shows three featured athletes on the preview (`validate-schools --athletes-only`, Oct 22). Three verified Instagram in every sport.

## Open

- Track & Field, Gymnastics, Baseball and Softball fill when published.
- First live cards not yet observed.
