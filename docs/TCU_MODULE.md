# TCU school module

`src/schools/tcu.mjs` owns TCU's gofrogs.com schedule and roster routes, its program combinations, its verified Instagram entries and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

TCU was chosen on October 7, 2026 (user: "Start TCU. Break the speed record"). All 14 sports were converted and tested one at a time, then published together in one PR (#236, batched publishing, `AGENTS.md` item 3). gofrogs.com returns 403 to the sandbox, so every official page used as a fixture came through the private source route, unmodified (`scripts/fetch-school-fixtures.mjs`). The module is the scaffold's output (`npm run scaffold-school`) plus the TCU rules below.

## Status (`4.57.0-tcu`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals with their own recaps, 7 upcoming; record `2-3 · Big 12 0-2` (as published); ESPN live score |
| Volleyball | `womens-volleyball` | 15 finals with their own recaps (Yale and Rice share one), 14 upcoming; `13-2 · Big 12 4-0`; ESPN live score |
| Soccer | `womens-soccer` | 10 finals with their own recaps, 7 upcoming; the two August exhibitions published no score and are left out; `5-4-1 · Big 12 2-2`; ESPN live score |
| Cross Country | `cross-country` | 3 finals with complete TFRRS results (`TX_college_f_TCU`, `TX_college_m_TCU`); the Cowboy Jamboree (no story linked, women only on TFRRS) takes its story from the archive |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; the Costa Rica exhibitions (`(Exh.)`) read `(Exhibition)` and stay out of the record; Players Era rounds read `at`; ESPN live scores |
| Baseball | `baseball` | 33 spring games; ESPN live score |
| Beach Volleyball | `womens-beach-volleyball` | Fall exhibitions; `TCU at TCU Fall Invitational (Exhibition)`; the played Oct 2 exhibition published no score and is left out |
| Equestrian | `equestrian` | 3 finals (`W, 16-2`) with their stories; `1-2` |
| Golf | `womens-golf`, `mens-golf` | Labeled; one event per tournament with its last round's place; men's places publish no suffix (`3/14` reads `3rd of 14`); The Ally's final round was cancelled (Oct 7): the round-two place stands (`6th of 17`) and the tournament is final that day |
| Rifle | `rifle` | 2 finals (`2nd - 4,718`) with their stories |
| Swimming & Diving | `swimming-and-diving` (one page, both teams) | The schedule gives past meets no score and links no story: each is final (`Completed`) with its archive story (Texas A&M and Incarnate Word share the Sep 26 story); `at Arkansas, vs. Drury` reads `TCU at Arkansas and Drury`; `CSCAA Open Water Championship` reads `at` |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; men's fall tournaments with their stories; women's past tournaments have no story and are left out (K-State's rule); ITF events read `at` |
| Track & Field | `track-and-field` | 22 upcoming 2027 meets, one event per meet |
| Triathlon | `triathlon` | 3 finals (`1st Place (298 Points)`) with their stories |

## TCU rules (beyond the scaffold)

- `(Exh.)` and `(Ex.)` are exhibition labels.
- A non-game sport's opponent that names an event (`Invitational`, `Invite`, `Championship(s)`, `Classic`, `ITF …`) or an away double dual reads `at`.
- Men's golf: a place without a suffix (`3/14`) reads as an ordinal.
- Golf: a cancelled round keeps the round before it's place; a cancelled last round ends the tournament that day.
- Swimming & Diving: a past meet without a score is final, a meet, with its archive story (`meetSports`).
- Cross Country: archive stories (`meetSports`) and TFRRS.

Each rule was mutated and every mutation fails `npm run test:tcu-module`.

## Athletes

Three featured athletes in every sport; three with verified Instagram in 13 of 14. Triathlon: the roster (13 cards) publishes two Instagram links: Marley Andelman, and Sara Gimena, whose card links `https://www.instagram.com/https://www.instagram.com/saragimena_02/` (doubled), so the account it names is listed in `verifiedInstagrams`. None of the 13 profile pages publishes another, and the team account `@tcutriathlon` can't be read without a login (Instagram returns `require_login`, Oct 7). An official roster-profile card fills the third slot (Antonia Jubb), and Triathlon is in `athlete_profile_fallback_sports`.

## Limitations

Not fixable from the official sources today:
- Soccer's and beach volleyball's played exhibitions, and women's tennis's past tournaments, publish no score or story and are left out.
- Swimming meets read `Completed` (the schedule publishes no dual scores); the story carries the results.
- Cowboy Jamboree: TFRRS lists only TCU's women.
- No finals yet for Baseball, Track & Field, women's basketball; live scores are tested on real ESPN payloads but no TCU game has been observed live under the module yet (soccer vs UCF Oct 8, volleyball vs Arizona Oct 9).
