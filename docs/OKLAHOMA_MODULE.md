# Oklahoma school module

`src/schools/oklahoma.mjs` owns Oklahoma's soonersports.com routes, program combinations, verified Instagram pins and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Oklahoma was added to the app on October 8, 2026, with Kentucky (PR #259). All 13 sports were built and tested one at a time and published in one PR. The site is SIDEARM (Nuxt page data) and refuses the sandbox, so it is read through the private source. The module starts from Texas's handlers (`scripts/port-handlers.mjs`).

## Status (`4.66.1-oklahoma-kentucky`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 4 finals with stories; 2-2 (SEC 0-1); ESPN live score |
| Volleyball | `volleyball` | 13 finals with stories; 9-4 (SEC 2-2), equal to the page's .692 / .500; ESPN live score |
| Soccer | `soccer` | 13 finals with stories; 9-2-2 (SEC 3-2), equal to the page's .769 / .600; ESPN live score |
| Cross Country | `cross-country` | TFRRS (`OK_college_f_Oklahoma`, `OK_college_m_Oklahoma`): Cowboy Preview, Cowboy Jamboree |
| Golf | `womens-golf`, `mens-golf` | `1st of 11` / `831 (-33)`; the NB3 Matchplay as its matches (`Match play: 2-0-1`) |
| Tennis | `womens-tennis`, `mens-tennis` | ITA All-American (both); players' pro events left out |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; `Southern Nazarene - EXH` is an exhibition |
| Baseball, Softball | `baseball`, `softball` | Fall exhibitions; Fall World Series and Battle Series (intrasquad) left out |
| Gymnastics | `womens-gymnastics`, `mens-gymnastics` | Both pages still show 2026: valid empty schedules until 2027 is published |
| Track & Field | `track-and-field` | The page still shows 2026: fills when 2026-27 is published |
| Rowing, Wrestling | `rowing`, `wrestling` | Fall races and 2026-27 duals upcoming (wrestling is Big 12) |

## Oklahoma rules (beyond Texas's)

- **Golf places:** the place in the field, then the team score to par: `1st/11 - 831 (-33)`. Men's golf writes no suffix: `10/16 - 864 (+24)`.
- **Match play:** cards that each carry match points under one tournament (NB3 Matchplay, Sep 29-30) read as one event with a row per match.
- **Two-poll rankings** with an unranked poll: `#-/22 Texas`.
- **Exhibitions:** `- EXH` is an exhibition label.
- **Left out:**
  - players' pro tennis events (`W75 Templeton`, `W15 Nashville`, `Columbia Futures 15K`, `ITF …`);
  - baseball's Fall World Series and softball's Battle Series (intrasquad).

Every rule was mutated, and every mutation fails `npm run test:oklahoma-module`.

## Athletes

13/13 on the preview, three per sport.
- **Pins:** Cross Country (10 links in 18 profiles) and Golf (12 in 18) are pinned.
- **Profile cards:** Volleyball uses them (`athlete_profile_fallback_sports`). `scripts/athlete-evidence.mjs` (Oct 8) read all 15 volleyball profile pages, and none publishes an athlete Instagram link.

## Limitations

- **Waiting on publication:** Gymnastics (both teams) and Track & Field fill when soonersports.com publishes the new seasons.
- **Live cards:** no live card observed yet (football vs Texas Oct 10).
