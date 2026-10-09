# West Virginia school module

`src/schools/west-virginia.mjs` owns West Virginia's wvusports.com schedule and roster routes, its program combinations and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

West Virginia was converted on October 7, 2026 (user: "Finish big 12 with West Virginia. New speed record"), the last Big 12 school. All 14 sports were converted and tested one at a time, then published together in one PR (batched publishing, `AGENTS.md` item 3). The module is Texas Tech's reader (copied from `const HOST=` down) with West Virginia's routes and the rules below. Fixtures are the official pages, unmodified (`scripts/fetch-school-fixtures.mjs`).

## Status (`4.59.0-west-virginia`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals (Virginia, Sep 19: result line, no story linked), 7 upcoming; record as published; ESPN live score |
| Volleyball | `womens-volleyball` | 15 finals (the James Madison exhibition reads `(Exhibition)`, out of the record), 14 upcoming; `9-5` as published; ESPN live score |
| Soccer | `womens-soccer` | 10 finals, each with its story, 8 upcoming; record as published; ESPN live score |
| Cross Country | `womens-cross-country` | Women only. 2 finals with TFRRS team results (`WV_college_f_West_Virginia`); the schedule's "RMU Invitational" is TFRRS's "RMU Colonial Cross Country Invitational" |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions read `(Exhibition)`; ESPN live scores |
| Baseball | `baseball` | Fall exhibitions and 2027 spring games; ESPN live score. Fall "Gold vs. Blue" intrasquads are left out; the Indiana and Akron fall exhibitions (Sep 27, Oct 3) publish neither score nor story and are not shown |
| Golf | `mens-golf` | Men only. One event per tournament with its last round's place (`8th`, `T6th`), each with its story |
| Tennis | `womens-tennis` | Women only. The page lists a tournament once per day; one event per tournament (`UTR Charleston`, Sep 18-20), each with its story |
| Swimming & Diving | `womens-swimming-and-diving`, `mens-swimming-and-diving` | Labeled; dual scores (`W, 214-61`), each with its story |
| Rifle | `rifle` | 4 matches with aggregate scores (`W, 4737-4587`), each with its story (Mount Aloysius, Sep 26: the schedule links none; from the archive) |
| Wrestling | `wrestling` | Duals and tournaments (multi-day tournaments one event); the intrasquad "Wrestle Off" is left out |
| Gymnastics | `womens-gymnastics` | The page still lists the 2026 season: no current events (fills when published) |
| Rowing | `womens-rowing` | The page still lists 2025-26: no current events (fills when published) |
| Track & Field | `womens-track-and-field` | The page still lists 2025-26: no current events (fills when published) |

## West Virginia rules (beyond Texas Tech's)

- Golf and cross country write the place alone, as "8th Place", "T-6th Place" or "First Place": golf reads `8th`/`T6th`; cross country and track (women only) read `Women's team: 1st`, which TFRRS then checks and completes with points.
- Tennis and wrestling list a tournament once per day: one event from its first to its last day (`mergeMeetDays`).
- The intrasquad "Wrestle Off" is internal.
- A rifle match the schedule links no story for takes it from the archive (`meetSports` includes Rifle).
- TFRRS meet names can differ from the schedule's: the kit's `createTfrrsMeetResults` takes a `meetName` option (default the opponent; other schools unchanged).

Each rule was mutated and every mutation fails `npm run test:west-virginia-module`.

## Athletes

Certification is listed for all 14 sports (minimum 3) in `tests/certified-schools.json`; the run on the preview is recorded in the handoff.

## Limitations

- **Rifle conference (fixed Oct 9, 4.75.1):** the record read "Big 12 1-0"; the Big 12 sponsors no rifle: no conference record (shared rule in `src/conference-games.mjs`).

- Golf: the schedule publishes the place without the field size ("8th Place"). The stories give it in prose for three of the four tournaments ("in the 16-team field") but not for the New York Harbor Cup, so the headline shows the place only.
- Volleyball: the James Madison exhibition (Aug 22, `L, 2-3`) has a result line but no official story. The volleyball archive lists every story from August (Aug 13 scrimmage, Aug 19 promotions, then Aug 25 onward) and none covers it, so its expanded view shows no recap (`validate-schools --deep` reports it; 13/14 sports pass deep).
- Gymnastics, Rowing, Track & Field: the schedule pages have not published the 2026-27 season.
- No finals yet for Basketball, Baseball, Wrestling; live scores are tested on real ESPN payloads (football at Iowa State, volleyball vs Houston, soccer at Houston) but no West Virginia game has been observed live under the module yet.
