# Washington State school module

`src/schools/washington-state.mjs` configures the shared WMT JSON-API kit (`src/wmt-api-kit.mjs`) for wsucougars.com: one `/website-api/schedule-events` address per team, written by `scripts/port-wmt-api.mjs` through `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Washington State was added to the app on October 19, 2026 (11 sports) in the Pac-12. wsucougars.com is WMT (Nuxt) and is read directly.

## Status (`4.112.1-washington-state`)

| Sport | Teams | State |
| --- | --- | --- |
| Football | `football` | Finals with stories |
| Volleyball | `volleyball` | Finals with stories; Idaho exhibition (Aug 15) with its score, no story published |
| Soccer | `womens-soccer` | Finals with stories |
| Cross Country | `cross-country` (both teams) | Team places and points from TFRRS (the team is "Washington St." there: the shared TFRRS reader now retries the short name); the schedule's "3rd (W), 5th (M)" read |
| Golf | `womens-golf`, `mens-golf` | Combined; "+29 (893), 9th" read as place and team score; Pat Lesser Harbottle (women) and Oregon State Invitational (men) "Completed" with their stories: the final rounds were never published (the API keeps the last round "as scheduled" with no result, and the only stories are from before the final round); CDA National Reserve (men) has no result or story: not listed |
| Swimming & Diving | `womens-swimming` | Duals scored; Air Force and Denver read dual by dual ("Denver: L, 144-150 · Air Force: W, 157-137"); MPSF Open Water 2nd; Colorado State "Completed" with its story |
| Rowing | `womens-rowing` | Head races "at" (Head of the Snake, Head of the Spokane), "Completed" with stories |
| Tennis | `womens-tennis` | Tournaments "Completed" with stories |
| Basketball | `womens-basketball`, `mens-basketball` | Combined; season starts in November |
| Baseball, Track & Field | | 2026-27 not yet published: valid empty |

## Rules (shared kit)

- Golf "to par (total), place"; cross country "3rd (W), 5th (M)"; duals by code ("DU: L,150-144; AF: W, 157-137"), the opponent written once when the second repeats a "/" part; "Head of the ..." is an event ("at").
- Shared TFRRS reader: a school TFRRS calls "X St." (Washington State, San Diego State, Colorado State) is read under that name when the full name has no rows.

Each rule was mutated and each mutation fails `node tests/washington-state-module.mjs`; Stanford's, Virginia Tech's, Notre Dame's and San Diego State's tests pass unchanged.

## Athletes

Profile pages link Instagram in Basketball (12 of 30), Cross Country (21), Golf (14), Rowing (13), Swimming & Diving (23), Tennis (7), Track & Field (18), Soccer (2); none in Baseball (39 read) and Volleyball (18 read). Pins for Basketball, Soccer, Tennis. wsucougars.com links its Opendorse marketplace (`opendorse:{marketplace:'washingtonstate-cougars',team:'Washington State Cougars'}`); profile cards fill what remains (`athlete_profile_fallback_sports`: Baseball, Soccer, Volleyball).

## Open

- Baseball and Track & Field fill when 2026-27 is published.
- First live cards not yet observed.
