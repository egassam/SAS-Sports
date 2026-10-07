# Iowa State school module

`src/schools/iowa-state.mjs` owns Iowa State's cyclones.com schedule and roster routes, its program combinations and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Iowa State was chosen on October 7, 2026 (user: "Start Iowa State. Once finished tell me how long it took and learn to make the next school faster"). All 12 sports were converted and tested one at a time, then published together in one PR (batched publishing, `AGENTS.md` item 3). cyclones.com returns HTTP 403 to the development sandbox, so every official page used as a fixture came through the private source route, unmodified (`scripts/fetch-school-fixtures.mjs`, `scripts/fetch-official.mjs`).

Iowa State is the second school built from the shared SIDEARM kit (`src/sidearm-school-kit.mjs`) and the first set up entirely by `npm run scaffold-school`: the module is the scaffold's output with the settings below.

## Status (`4.54.0-iowa-state`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals (`W, 45-42`) with their own recaps; 8 upcoming with published Central times or the date alone (TBA); the Big 12 Championship (no opponent yet) reads `Iowa State at Big 12 Football Championship`; ESPN live score (shared FBS-group request; Iowa is never taken for Iowa State) |
| Volleyball | `womens-volleyball` | 15 finals (`W, 3-1`) with their own recaps, 14 upcoming; rankings dropped; ESPN live score |
| Soccer | `womens-soccer` | 12 finals (`T, 1-1`) with their own recaps, 7 upcoming; ESPN live score |
| Cross Country | `cross-country` | Complete results from TFRRS (`IA_college_f_Iowa_State`, `IA_college_m_Iowa_State`): `Women's team: 7th · 193 pts / Men's team: 1st · 24 pts`, every Iowa State runner per race; the canceled home meet left out; each meet's story from the cross country archive (the schedule links none) |
| Basketball | `mens-basketball`, `womens-basketball` | Men's 36 + women's 33, labeled; exhibitions `(Exhibition)` (the site's `(Ex.)` too); the Players Era final (no opponent yet) reads `at Players Era Men's Championship Game`; bracket games name the possible opponents as published (`vs Tennessee or Maryland`); Big 12 tournaments one event each; ESPN live scores for both teams |
| Golf | `golf` (men), `womens-golf` | Both teams, labeled (men's golf is `/sports/golf/`, which names no team: `teamLabels`); one event per tournament with the last round's place and story (`11th of 17`); a finished tournament without a published place reads `Completed` |
| Gymnastics | `womens-gymnastics` | Empty schedule (the page still shows 2026); in season, meets read as games with their scores (`L, 191.325-196.850`) |
| Tennis | `womens-tennis` | Fall tournaments, one event each from first to last day, each with Iowa State's story |
| Swimming & Diving | `womens-swimming-and-diving` | Women's only (no longer a combined sport); the intrasquad Cardinal & Gold meet is internal; dual meets scored as games (`L, 101-197`); a meet's days are one event; a multi-day event at a neutral site reads `at` (National Invitational Championships) |
| Softball | `softball` | Fall exhibitions labeled (the played ones published no score and are left out); spring series; the Big 12 tournament (card: `Big 12`) is named after its tournament; ESPN live score |
| Track & Field | `track-and-field` | Empty schedule (the page still shows 2026); in season one event per meet |
| Wrestling | `wrestling` | 19 duals and tournaments; multi-day tournaments at a neutral site read `at` (`Iowa State at Soldier Salute`) |

## Routes

Every sport routes to its official page(s) only. The generic pages (`/sports/basketball/`, `/sports/gymnastics/`, `/sports/tennis/`, `/sports/track-field/`, the swimming variants), `/sports/mens-golf/` and the homepage render SIDEARM's empty `@season @sport` template or no schedule (fixtures kept, checked by the test). Iowa State sponsors women's gymnastics, tennis and swimming & diving only. Basketball and Golf combine the men's and women's pages, labeled.

## Settings that differ from Houston's

- **Open championships:** a championship game whose opponent is not known yet names only the event (opponent and tournament alike, or the opponent starts with the tournament's name): `Iowa State at Big 12 Football Championship`, `at Players Era Men's Championship Game`.
- **Neutral multi-day events:** a multi-day event at a neutral site is a meet or tournament and reads `at` (swimming's National Invitational Championships; wrestling's National Duals Invitational and Soldier Salute).
- **Conference tournaments:** the card's opponent may be only the first words of the tournament (`Big 12` for the `Big 12 Softball Tournament`).
- **Exhibitions:** `(Ex.)` is the site's short label and reads `(Exhibition)`.
- **Men's golf page label:** `teamLabels:{'/sports/golf/schedule':"Men's"}` (new module field read by `teamLabelForSource`).
- **Cross country stories:** `createArchiveStory({meetSports:new Set(['Cross Country'])})` (new kit option): a finished meet without a story takes the first archive story dated from its first day to the day after its last that names every distinctive word of the meet (`cyclone`, `preview`; `roy`, `griak`). The Roy Griak men's story says only "Griak Invitational", so the women's story is used.

These four rules are also in the scaffold template (`scripts/templates/sidearm-handlers.mjs.txt`), so the next school starts with them.

`npm run test:iowa-state-module` (also in `npm test` and `npm run test:release`) covers all 12 sports from the unmodified fixtures: each final matches only its own recap; ESPN payloads for football, volleyball and soccer; TFRRS and the archive stories; last season's track and gymnastics pages. Each new rule was mutated and every mutation fails the test (10 of 11; the meet-span rule is not exercised by a single-day meet).

## Limitations

Not fixable from the official sources today:
- **Track & Field and Gymnastics 2026-27 schedules unpublished** (both pages still show 2026). The app shows the empty-schedule note; the season fills in when the pages are updated.
- **Men's golf, Cullan Brown Collegiate (Oct 5-6):** no place or story published yet; reads `Completed` until the schedule publishes them.
- **Softball fall games** publish no score and are left out once played.
- **No finals yet** for Basketball and Wrestling (seasons start Oct 18 and Nov 1).
- **Live scores** are tested on real ESPN payloads; no Iowa State game has been observed live under the module yet.
