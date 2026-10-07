# Texas Tech school module

`src/schools/texas-tech.mjs` owns Texas Tech's texastech.com schedule and roster routes, its program combinations and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Texas Tech was chosen on October 7, 2026 (user: "Let's do Texas tech. Learn from it. We need more speed"). All 10 sports were converted and tested one at a time, then published together in one PR (batched publishing, `AGENTS.md` item 3). texastech.com returns 403 to the sandbox, so every official page used as a fixture came through the private source route, unmodified (`scripts/fetch-school-fixtures.mjs`). The module is TCU's reader (TCU's rules are a superset of the scaffold's) with Texas Tech's routes and the rules below.

## Status (`4.58.0-texas-tech`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals with their own recaps, 7 upcoming; record `5-0 · Big 12 2-0` (as published); ESPN live score |
| Volleyball | `womens-volleyball` | 16 finals (15 with their own recaps; Central Arkansas has a result line and no story), 14 upcoming; `8-8 · Big 12 0-4` (as published); ESPN live score |
| Soccer | `womens-soccer` | 12 finals (Arizona State, Oct 2, has its score and no story yet), 8 upcoming; the New Mexico exhibition reads `(Exhibition)` and stays out of the record; `7-0-4 · Big 12 3-0-1` (as published); ESPN live score |
| Cross Country | `cross-country` | 4 finals with TFRRS team results (`TX_college_f_Texas_Tech`, `TX_college_m_Texas_Tech`); the Nike XC Town Twilight (Oct 2, no result or story on the schedule) takes its story from the archive |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions read `(Exhibition)`; bracket rounds with "Opponents TBD" read as their tournament; ESPN live scores |
| Baseball | `baseball` | Fall exhibitions and 2027 spring games; ESPN live score |
| Softball | `softball` | Fall exhibitions and 2027 spring games; ESPN live score |
| Golf | `womens-golf`, `mens-golf` | Labeled; one event per tournament with its last round's place (`7th of 11`, `T3rd of 16`), each with its story |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; 7 past tournaments, each with its story; the home Lubbock 25K reads as its tournament |
| Track & Field | `track-and-field` | The page still lists 2025-26: no current events (fills when texastech.com publishes 2026-27) |

## Texas Tech rules (beyond TCU's)

- A bracket round whose opponent is "Opponents TBD", or a home tournament whose opponent names the school ("Texas Tech University", the Lubbock 25K), reads as its tournament.
- A neutral postseason game named after its round ("NCAA Championship Semifinals") reads `at`.
- The page's own story link may be dated up to 3 days after an event's last day (`ownLinkDays`, new kit option; the ACU Invitational, Sep 18-20, posted Sep 22). Other schools keep 1.

Each rule was mutated and every mutation fails `npm run test:texas-tech-module`.

## Athletes

Certification is listed for all 10 sports (minimum 3) in `tests/certified-schools.json`; the run on the preview is recorded in the handoff.

## Limitations

- Track & Field: the schedule page has not published 2026-27.
- No finals yet for Basketball, Baseball, Softball; live scores are tested on real ESPN payloads (football at Colorado, volleyball at Arizona, soccer vs Arizona State) but no Texas Tech game has been observed live under the module yet.
- NMJC Invite: TFRRS lists only Texas Tech's men (the women did not run); the Nike XC Town Twilight men ran without a team score.
