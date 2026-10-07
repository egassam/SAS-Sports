# LSU school module

`src/schools/lsu.mjs` owns LSU's lsusports.net schedule and roster routes, its program combinations, its verified Instagram identities and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

LSU was added to the app and converted on October 7, 2026, together with Georgia (user: "Add Georgia and LSU. Learn from it and optimize for the next two"). lsusports.net is a WMT (Nuxt) site like Cincinnati's, but its cards differ: they carry no `datetime` and no year. So LSU has its own reader instead of the SIDEARM kit. All 13 sports were converted and tested one at a time and published in PR #244. Fixtures are the official pages, unmodified (`scripts/fetch-school-fixtures.mjs`, which now reads WMT pages through the module).

## Status (`4.61.0-georgia-lsu`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `fb` | 5 finals, each with its story; record 4-1 (SEC 1-1) as published; ESPN live score |
| Volleyball | `vb` | 13 finals, each with its story; 7-6 (2-2) as published; ESPN live score |
| Soccer | `sc` | 13 finals, each with its story; 3-8-2 (1-3-1) as published; ESPN live score |
| Cross Country | `xc` | One meet per day from the per-team cards ("(W)", "(M)"); places and runners from TFRRS (`LA_college_f_LSU`, `LA_college_m_LSU`); the men's cancelled Paul Short race is left out |
| Golf | `mg`, `wg` | Labeled. Day cards are merged into one tournament, which takes its last day's story. The team place comes from the headline when the team is its subject (Inverness 12th, Bryan Bros 7th); otherwise it reads "Completed" with the story |
| Tennis | `mt`, `wt` | Labeled. Duals follow the card's vs./at; tournaments read "at". A past tournament without a story is not listed. The men's page also lists players' pro events (ATP/ITF), which are shown as upcoming tournaments |
| Swimming & Diving | `sd` | One page for both teams. Day cards are merged per invitational; the intrasquad is left out |
| Basketball | `mb`, `wbball` | Labeled; exhibitions labeled; ESPN live scores |
| Baseball, Softball | `bsb`, `sb` | Fall exhibitions labeled; softball's Purple/Gold World Series is left out; ESPN live scores |
| Beach Volleyball, Gymnastics | `bvb`, `gm` | 2027 season. The fall events of the spring sports are dated in 2026 |
| Track & Field | `tf` | The page still lists the 2026 spring season, so there are no current events (fills when published) |

## LSU rules

- **Year:** each card's year comes from the page title. A range (`2026-27`) gives the first year for July–December and the second for January–June. A single-year title names the fall for Football, Soccer, Volleyball and Cross Country, and the spring for every other sport. Only the current academic year is listed.
- **Day cards:** a card named `(Day N)`, `(Stroke Play, …)` or `(Match Play, …)` joins the tournament with the same name whose last day is at most two days earlier. This holds even when another tournament is listed between the days.
- **Cross country:** the per-team cards become one meet.
- **Relation:** a tournament or meet is "at"; a dual follows its divider.
- **Left out:** cancelled or postponed cards, and internal events (intrasquad, scrimmage, Purple & Gold, Purple/Gold).
- **Exhibitions:** taken from the enclosing "Exhibition" or "Fall Exhibition" heading.
- **Recaps:** a card's own Recap link counts if it is dated from the event's first day to three days after its last. Any other story must name the opponent in its headline, and that name must not continue into a longer school name ("Michigan State" is not "Michigan").

Each rule was mutated, and every mutation fails `npm run test:lsu-module`.

## Limitations

- **Golf:** the cards publish no place. The place is shown only when the final story's headline gives the team's finish. Men's golf links a results PDF; women's golf links only live scoring (Clippd/Golfstat).
- **Men's golf, RedHawk Intercollegiate (Sep 14):** no story and no place are published, so the tournament is not listed.
- **Track & Field:** fills when lsusports.net publishes the 2027 season.

## Athletes

Certification lists all 13 sports (minimum 3). LSU's WMT roster cards carry each athlete's Instagram link. Basketball's cards link profiles under the season (`/roster/season/2026-27/player/...`), which the shared roster reader did not accept, so basketball showed no athletes on the first preview. The reader now accepts that form (`src/index.js`, `rosterProfiles`; tested in `tests/lsu-module.mjs` with the men's roster).
