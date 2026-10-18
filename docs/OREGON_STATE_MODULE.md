# Oregon State school module

`src/schools/oregon-state.mjs` owns Oregon State's osubeavers.com routes, program combinations and its SIDEARM schedule handlers (ported from NC State's with `start-schools --from=nc-state`). The event/result contract, caching, display and generic parsing stay shared.

Oregon State was added to the app on October 18, 2026 (12 sports, one PR with San Diego State) in the new Pac-12. osubeavers.com is SIDEARM behind bot defense: pages come through the private source route.

## Status (`4.111.0-oregon-state-san-diego-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | Finals with stories; record 5-2 |
| Volleyball | `womens-volleyball` | Finals with stories |
| Soccer | `womens-soccer`, `mens-soccer` | Combined; finals with stories; one labeled ESPN board per team; men's "(Big West Crossover)" label dropped from the opponent (non-conference games) |
| Cross Country | `womens-cross-country` (women only) | Team places from TFRRS (`OR_college_f_Oregon_State`); Nuttycombe and Bill Dellinger the same day (split squad, both on TFRRS); George Oja Invite "Completed" with its story (the story: no team score, fewer than five runners) |
| Golf | `womens-golf`, `mens-golf` | Combined; the card's place, to par, rounds and total ("10th (+18, 288-292-302—882)") |
| Basketball | `mens-basketball`, `womens-basketball` | Combined; men's exhibition at Michigan final; season starts in November |
| Softball, Baseball | `softball`, `baseball` | Fall exhibitions and the 2027 schedule (upcoming) |
| Rowing | `womens-rowing`, `mens-rowing` | Combined; both pages still 2025-26: valid empty until published |
| Gymnastics, Track & Field, Wrestling | `womens-gymnastics`, `track-and-field`, `wrestling` | 2025-26 / 2026 pages: valid empty until 2026-27 is published |

## Rules

- Golf "place (to par, rounds—total)" (module; men's places have no suffix: "T3").
- Men's soccer "(Big West Crossover)" is not part of the opponent's name (module).

Every new rule was mutated and each mutation fails `node tests/oregon-state-module.mjs`.

## Athletes

Profile pages link Instagram in Baseball (13 of 40), Football (9 of 107), Gymnastics (12 of 18), Rowing (11 of 35), Soccer (12 of 85), Volleyball (8 of 30), Basketball (1), Golf (1); none in Cross Country, Softball, Track & Field, Wrestling. Three per sport are pinned where links are sparse (`verifiedInstagrams`). osubeavers.com links its INFLCR Exchange (`inflcr:{school:'oregon-state-university'}`), read for athletes still without a link; profile cards fill the rest (`athlete_profile_fallback_sports`: Basketball, Cross Country, Golf, Softball, Track & Field, Wrestling).

## Open

- Rowing, Gymnastics, Track & Field, Wrestling fill when 2026-27 is published.
- First live cards not yet observed.
