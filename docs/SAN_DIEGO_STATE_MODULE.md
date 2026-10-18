# San Diego State school module

`src/schools/san-diego-state.mjs` configures the shared WMT JSON-API kit (`src/wmt-api-kit.mjs`) for goaztecs.com: one `/website-api/schedule-events` address per team (the site's sport ids from `/website-api/sports`), written by `scripts/port-wmt-api.mjs` through `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

San Diego State was added to the app on October 18, 2026 (13 sports, one PR with Oregon State) in the new Pac-12. goaztecs.com is WMT (Nuxt) and is read directly.

## Status (`4.111.0-oregon-state-san-diego-state`)

| Sport | Teams | State |
| --- | --- | --- |
| Football | `football` | Finals with stories |
| Volleyball | `volleyball` | Finals with stories; conference games as the API flags them (Pac-12) |
| Soccer | `womens-soccer`, `mens-soccer` | Combined; finals with stories |
| Cross Country | `womens-cross-country` (women only) | Places and team points from the schedule ("6th (157 pts)"); meets the API names by host ("Oregon", "UC Riverside") take the meet's name from their story (Bill Dellinger Invitational, Highlander Invitational); TFRRS `CA_college_f_San_Diego_State` |
| Golf | `womens-golf`, `mens-golf` | Combined; one API entry per round with no tournament: merged by name, last round's place ("4th - 890 (+26)", "T-10th of 12; 906 (+42)") |
| Swimming & Diving | `swimming-and-diving` | Duals scored; Gary Ota Memorial "1st of 5" with 1,090.50 pts |
| Tennis | `womens-tennis`, `mens-tennis` | Combined; tournaments "No team score" ("NTS") with stories; the ATP San Diego Challenger (players' pro event) not listed |
| Basketball | `womens-basketball`, `mens-basketball` | Combined; men's exhibition at Arizona final |
| Softball | `softball` | Fall games and the 2027 schedule |
| Baseball, Lacrosse, Track & Field, Water Polo | | 2026-27 not yet published: valid empty |

Women's rowing (sport id 17) is hidden from the site's menu and points to an old season (id 125; current teams use 135-139): not in the app.

## Rules (shared kit, `src/wmt-api-kit.mjs`)

- Unscored meet entries without a tournament merge by opponent name when they follow within two days (golf rounds).
- Golf "place - total (to par)" and "place of N; total (to par)"; swimming "1st of 5 teams (1,090.50 pts)"; cross country "6th (157 pts)"; tennis "NTS".
- A ranking written into the opponent's name ("#9", "No. 10", "(rv)") is dropped.
- A cross country meet named by its host takes the meet's name from its story's title.
- "Challenger" tennis events are pro events.
- A cross country or golf entry is never a dual ("vs Pac-12" read "at Pac-12" after the first preview check).

Each rule was mutated and each mutation fails `node tests/san-diego-state-module.mjs`; Stanford's, Virginia Tech's and Notre Dame's tests pass unchanged.

## Athletes

Profile pages link Instagram widely in Basketball, Football, Soccer, Softball, Track & Field, Water Polo; sparsely in Baseball (7), Cross Country (5), Golf (10), Lacrosse (11), Swimming & Diving (3), Tennis (2), Volleyball (1): three are pinned there (`verifiedInstagrams`). goaztecs.com's NIL page (`/sports/aztec-nil`) links its INFLCR Exchange (`inflcr:{school:'san-diego-state-university'}`); profile cards fill what remains (`athlete_profile_fallback_sports`: Tennis, Volleyball).

## Open

- Baseball, Lacrosse, Track & Field, Water Polo fill when 2026-27 is published.
- First live cards not yet observed.
