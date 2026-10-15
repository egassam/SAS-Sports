# SMU school module

`src/schools/smu.mjs` owns SMU's smumustangs.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (NC State's handlers, `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

SMU was added to the app on October 15, 2026 (11 sports, one PR with Pitt). smumustangs.com is a SIDEARM site, read directly.

## Status (`4.92.0-pitt-smu`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; opponents ranked in brackets ("[23/RV] Louisville") read as the school |
| Volleyball | `womens-volleyball` | Finals with stories; two exhibitions (Aug 27) labeled |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled (combined); finals with stories |
| Cross Country | `womens-cross-country` (women only) | Team places with points; TFRRS `TX_college_f_SMU` |
| Golf | `womens-golf`, `mens-golf` | Labeled. Women's rounds published as "<Tournament> Day N": one tournament with the last round's place (T4th of 17, T5th of 13) |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; men's three tournaments with stories; women's ITA All-Americans with its story; ACU and Rice Invitationals and ITA Regional have no story (archive checked Oct 15): not listed |
| Swimming & Diving | `womens-`, `mens-swimming-and-diving` | Labeled; double duals with scores; the SMU Classic's "Day One"/"Day Two" are one meet with its place ("3rd, 271" → 3rd · 271 pts) |
| Equestrian | `equestrian` | Finals with stories |
| Basketball | `mens-`, `womens-basketball` | Labeled |
| Rowing | `rowing` | Fall races upcoming |
| Track & Field | `womens-track-and-field` | 2026-27 page not published yet (valid empty) |

## SMU rules

- `combinedSports`: Basketball, Golf, Soccer, Swimming & Diving, Tennis.
- Golf rounds named "<Tournament> Day N" are one tournament; a golf final without a place takes it from its story (team pattern Mustangs/Ponies/SMU).
- Swimming meet places may carry no unit ("3rd, 271").
- Shared (this session): `withoutRanking` reads two polls in brackets; `mergeMeetDays` merges a meet's "Day One"/"Day Two" entries under the meet's name.

Every new rule was mutated and each mutation fails `node tests/smu-module.mjs`.

## Athletes

Pinned from the profile pages (Oct 15): Soccer (Hali Hartman, Aubrey Brown, Jessi Curry; 6 of 86 profiles link Instagram), Tennis (Allie Bittner, Natalie Stasny, Caroline McGinley). Profile cards (`athlete_profile_fallback_sports`): Basketball (28 profiles), Cross Country (13), Football (106), Golf (15), Rowing (47), Track & Field (27): no athlete Instagram on any profile. Equestrian, Swimming & Diving and Volleyball publish enough.

## Open

- Track & Field fills when 2026-27 is published.
- Women's tennis ACU/Rice Invitationals and ITA Regional join if a story is published.
- First live cards not yet observed (soccer, volleyball).
