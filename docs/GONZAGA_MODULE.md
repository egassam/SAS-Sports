# Gonzaga school module

`src/schools/gonzaga.mjs` owns Gonzaga's gozags.com routes, program combinations and its SIDEARM schedule handlers (ported from NC State's with `start-schools --from=nc-state`). The event/result contract, caching, display and generic parsing stay shared.

Gonzaga was added to the app on October 18, 2026 (9 sports, one PR with Fresno State) in the new Pac-12. gozags.com is SIDEARM; Node reads it directly (curl's agent gets 403). Gonzaga sponsors no football (`add-school` had listed it from the football address; fixed).

## Status (`4.110.0-fresno-state-gonzaga`)

| Sport | Pages | State |
| --- | --- | --- |
| Volleyball | `womens-volleyball` | Finals with stories (North Dakota State, Sep 18: result line, no story published) |
| Soccer | `womens-soccer`, `mens-soccer` | Combined; finals with stories; one labeled ESPN board per team |
| Cross Country | `cross-country` | Team places from TFRRS (`WA_college_*_Gonzaga`) |
| Golf | `womens-golf`, `mens-golf` | Combined; the card's place, to par and total ("16th, +55 (919)") |
| Rowing | `womens-rowing`, `mens-rowing` | Combined; head races are meets ("Completed" with stories) even when the card names no tournament |
| Tennis | `womens-tennis`, `mens-tennis` | Combined; tournaments "Completed" with stories |
| Basketball | `mens-basketball`, `womens-basketball` | Combined; season starts in November |
| Baseball, Track & Field | `baseball`, `track-and-field` | Spring; Track & Field 2026-27 not published: valid empty |

## Rules

- Golf "place, to par (total)" (module).
- Rowing: an unscored race is a meet (module `meet`).
- Cross country: `onlyMeetThatDay` (module).

Every new rule was mutated and each mutation fails `node tests/gonzaga-module.mjs`.

## Athletes

Profile pages link Instagram in Baseball (37 of 38) and Basketball (23 of 28); none in the other sports. **Correction (Oct 18, later session):** gozags.com's nav does link an INFLCR Exchange (`app.inflcr.com/exchange/gonzaga-university`, under the student-athlete menu; the first check missed it). The module now sets `inflcr:{school:'gonzaga-university'}`, so roster athletes without a profile link are looked up there; profile cards (`athlete_profile_fallback_sports`) still fill whatever slots remain in Cross Country, Golf, Rowing, Soccer, Tennis, Track & Field, Volleyball.

## Open

- Track & Field fills when 2026-27 is published.
- First live cards not yet observed.
