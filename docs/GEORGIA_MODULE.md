# Georgia school module

`src/schools/georgia.mjs` owns Georgia's georgiadogs.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Georgia was added to the app and converted on October 7, 2026, together with LSU (user: "Add Georgia and LSU. Learn from it and optimize for the next two"). All 13 sports were converted and tested one at a time, then published in PR #244. The module is Alabama's reader (copied from `const HOST=` down) with Georgia's routes and the rules below. georgiadogs.com refuses the sandbox (HTTP 403), so its fixtures came through the private source route; they are the official pages, unmodified.

## Status (`4.61.0-georgia-lsu`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; record 5-0 (SEC 3-0) as published; ESPN live score |
| Volleyball | `womens-volleyball` | 13 finals, each with its story; 11-2 (3-0) as published; the scrimmage and the two exhibitions that publish no result are left out; ESPN live score |
| Soccer | `womens-soccer` | 12 finals, each with its story; 4-3-5 (1-1-3) as published; ESPN live score |
| Cross Country | `cross-country` | 2 finals with both teams' places and points, confirmed by TFRRS (`GA_college_f_Georgia`, `GA_college_m_Georgia`) |
| Golf | `mens-golf`, `womens-golf` | Labeled. One event per tournament with its place and team score (`17th`, team score `891 (295-302-294)`); each has its story |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled. Tournaments take their story from the team archive. A past tournament without a story (the men's M15 Columbia pro event) is left out of the feed |
| Swimming & Diving | `msd`, `wsd` | Labeled (the addresses name no team: `teamLabels`). The College Swimming League match reads `4th · 207.5 pts` |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled. `Preseason - X` entries are exhibitions; the `SEC` entry reads `SEC Tournament`; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | 2027 spring season; ESPN live scores |
| Equestrian, Gymnastics, Track & Field | `equestrian`, `womens-gymnastics`, `track-and-field` | Upcoming meets; the equestrian scrimmage is internal |

## Georgia rules (beyond Alabama's)

- **Golf:** the total is written after `=` (`T6th (280-273-281=834)`).
- **Swimming:** a league place is written `4th, 207.5 pts.`.
- **Tennis:** a tournament is a meet, so it can take its archive story (Florida's rule). The feed drops a past tournament that has none (`isTennisWithoutStory`).
- **Exhibitions:** `(exh.)` labels and `Preseason - ` prefixes mark exhibitions.
- **Tournament names:** a multi-day entry whose opponent is the first word of its tournament (`SEC` of `SEC Tournament`) reads as the tournament.

Each rule was mutated, and every mutation fails `npm run test:georgia-module`.

## Athletes

Certification lists all 13 sports (minimum 3). Basketball, Golf, Gymnastics, Soccer, Softball and Volleyball show three verified Instagram athletes from roster cards or profile pages.

Seven sports use official profile cards (`athlete_profile_fallback_sports`). On October 7 every roster and every athlete profile page of these sports was read through the private source route: Baseball 39, Cross Country 20, Equestrian 47, Football 128, Swimming & Diving 52, Tennis 20, Track & Field 64 (370 pages). None publishes an athlete Instagram link. The same method found 17 of 17 on volleyball's profiles. Team-account tags could not be read: instagram.com answers the sandbox with its login page (HTTP 429).

## Limitations

- No live card observed yet (next games: volleyball at Mississippi State Oct 9, football Oct 10).
- Track & Field, Gymnastics, Baseball and Softball fill as their seasons start.
