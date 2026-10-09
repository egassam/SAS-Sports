# Oregon school module

`src/schools/oregon.mjs` owns Oregon's goducks.com routes, program combinations, verified Instagram pins and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Oregon was added to the app on October 9, 2026 (13 sports, one PR with Penn State). goducks.com is SIDEARM (Nuxt page data) behind bot defense: it refuses the development sandbox (403) and answers the Worker; fixtures and evidence are read through the private source route. The module starts from Oklahoma's handlers (`scripts/start-schools.mjs`).

## Status (`4.76.1-oregon-penn-state`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 4 finals with stories |
| Volleyball | `womens-volleyball` | 14 finals with stories |
| Soccer | `womens-soccer` | 14 finals with stories; the Aug 8 exhibition at Idaho has none (exhibition, out of the record) |
| Cross Country | `cross-country` | One page, a card per team's meet ("Cowboy Jamboree (m)"): labeled Men's/Women's, TFRRS team places (`OR_college_f/m_Oregon`) |
| Golf | `womens-golf`, `mens-golf` | Labeled; places from the cards with final stories |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; Duck Invitational and San Diego Veterans Classic with stories; ITA Regionals in progress |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; 2026-27 schedules |
| Softball | `softball` | Fall games upcoming |
| Baseball | `baseball` | 2027 page lists fall exhibitions |
| Acrobatics & Tumbling, Lacrosse, Track & Field | `acrobatics-tumbling`, `womens-lacrosse`, `track-and-field` | Pages still show the 2025-26 season: valid empty schedules until 2026-27 is published |
| Beach Volleyball | `beach-volleyball` | SIDEARM's empty template (season not published): a valid empty schedule until published |

## Oregon rules (beyond Oklahoma's)

- **Cross country team cards:** "(m)"/"(w)" after a meet's name is its team: the event reads "Men's · Oregon at Cowboy Jamboree".
- **Rankings after the name:** "Western Kentucky (RV)" reads "Western Kentucky".
- **Fall baseball notes:** "(10 Inn.)", "(DH)" are not part of the opponent.
- **Unpublished season:** SIDEARM's empty template ("@season @sport Schedule", beach volleyball) is a valid empty schedule, not a failed source (the first preview returned 502).
- **Conference bracket named by the league:** soccer's "Big Ten" card in the "Big Ten Tournament" reads "Oregon at Big Ten Tournament".

Every rule was mutated, and every mutation fails `node tests/oregon-module.mjs`.

## Athletes

Three per sport with verified Instagram from the official roster profiles (`scripts/athlete-evidence.mjs`, Oct 9). Basketball is pinned (10 links of 26 profiles).

## Limitations

- **Baseball athletes:** the 2027 roster lists staff only (no players yet); the sport is not in `athlete_sports` until it does.
- **Beach Volleyball:** schedule and roster pages are SIDEARM's empty template; both fill when published (no athletes until then).
- **Waiting on publication:** Acrobatics & Tumbling, Lacrosse and Track & Field schedules.
- **Golf, Jackson T. Stephens Cup (Sep 14-16):** stroke play 3rd of 6, then a match-play loss to Texas; the card publishes no final place: "Completed" with its story.
- **Live cards:** not observed yet (volleyball at Michigan State, Oct 9).
