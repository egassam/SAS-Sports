# Illinois school module

`src/schools/illinois.mjs` owns Illinois's fightingillini.com routes, program combinations, verified Instagram pins and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Illinois was added to the app on October 8, 2026, with Indiana: the first two Big Ten schools. All 13 sports were built and tested one at a time and published in one PR. The site is SIDEARM (Nuxt page data) and refuses the sandbox (403), so it is read through the private source. The module starts from Oklahoma's handlers (`scripts/port-handlers.mjs`).

## Status (`4.69.0-illinois-indiana`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 2-3 (Big Ten 0-2); ESPN live score |
| Volleyball | `womens-volleyball` | 15 finals with stories; 11-4 (Big Ten 3-1); ESPN live score |
| Soccer | `womens-soccer` | 12 finals with stories; 4-3-5 (Big Ten 1-3-2); ESPN live score |
| Cross Country | `womens-cross-country`, `mens-cross-country` | Each team's page is its own event with its own TFRRS race (`IL_college_f_Illinois`, `IL_college_m_Illinois`): Fighting Illini Invitational, Gans Creek Classic |
| Golf | `womens-golf`, `mens-golf` | Women `T4th of 11`; men `4th of 12` with `891 (+27)` |
| Tennis | `womens-tennis`, `mens-tennis` | Fall tournaments with their stories |
| Swimming & Diving | `womens-swimming-and-diving` | Women only (Illinois has no men's team); Purdue dual L, 132.5-167.5 |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions from Oct 17 |
| Baseball, Softball | `baseball`, `softball` | Fall exhibitions; softball's fall games publish no scores, so past ones are not listed |
| Wrestling | `wrestling` | 2026-27 duals upcoming |
| Track & Field | `womens-track-and-field`, `mens-track-and-field` | 2027 meets upcoming (from Jan 15) |
| Gymnastics | `womens-gymnastics`, `mens-gymnastics` | Both pages still show 2026: valid empty schedules until 2027 is published |

## Illinois rules (beyond Oklahoma's)

- **Men's golf:** the place in the field, the rounds and the total to par: `4th / 12 | 290-297-304--891 (+27)` reads `4th of 12`, team score `891 (+27)`.
- **Cross country split:** the two team pages list the same meets; each event keeps only its team's TFRRS race (Arkansas's split).

Every rule was mutated, and every mutation fails `npm run test:illinois-module`.

## Athletes

Three per sport from roster cards and profile pages (`scripts/athlete-evidence.mjs`, Oct 8: every sport publishes athlete Instagram links). **Pins:** Tennis (12 links in 18 profiles; three pinned).

## Limitations

- **Waiting on publication:** Gymnastics (both teams) fills when fightingillini.com publishes 2027.
- **Live cards:** no live card observed yet (soccer at USC and volleyball vs Wisconsin Oct 8; football at Michigan State Oct 10).
