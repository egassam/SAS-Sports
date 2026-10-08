# Indiana school module

`src/schools/indiana.mjs` owns Indiana's iuhoosiers.com routes, program combinations and its SIDEARM page-data reader settings. The event/result contract, caching, display and generic parsing stay shared.

Indiana was added to the app on October 8, 2026, with Illinois: the first two Big Ten schools. All 15 sports were built and tested one at a time and published in one PR. The site is SIDEARM (Nuxt page data); its football page refuses the sandbox (403), so pages are read through the private source. The module starts from Oklahoma's handlers (`scripts/port-handlers.mjs`). Field Hockey is new to the app with Indiana.

## Status (`4.69.0-illinois-indiana`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 5-0 (Big Ten 2-0); ESPN live score |
| Volleyball | `womens-volleyball` | 13 finals with stories; 10-3 (Big Ten 3-1); ESPN live score |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled by team; women 4-7-1 (1-5), men 10-0-2 (4-0-1); ESPN live score per team |
| Field Hockey | `field-hockey` | 11 finals with stories; 8-3 (Big Ten 4-0), equal to the Ohio State story; preseason exhibitions publish no scores |
| Cross Country | `cross-country` | One page for both teams; TFRRS (`IN_college_f_Indiana_IN`, `IN_college_m_Indiana_IN`): Sam Bell, John McNichols, Joe Piane |
| Golf | `womens-golf`, `mens-golf` | Place and team score (`T9th`, `903 (+39)`); the field size is not published; the Golfweek Invitational (individuals) reads Completed with its story |
| Tennis | `womens-tennis`, `mens-tennis` | Fall tournaments with their stories; women's ITA All-American has no story (not listed, as K-State) |
| Swimming & Diving | `womens-swimming-and-diving`, `mens-swimming-and-diving` | College Swimming League: men `1st · 575.5 pts`, women Completed with the shared story |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; season from November |
| Baseball, Softball | `baseball`, `softball` | Fall games publish no scores |
| Rowing, Wrestling | `womens-rowing`, `wrestling` | Fall races and 2026-27 duals upcoming |
| Track & Field | `track-and-field` | The page still shows 2025-26: fills when 2026-27 is published |
| Water Polo | `womens-water-polo` | The page still shows 2026: fills when 2027 is published |

## Indiana rules (beyond Oklahoma's)

- **Golf:** the place without the field size, then the team score to par: `t-9th Place • 903 (+39)`.
- **Rankings and seeds in brackets:** `(RV) Cal Poly`, `(5) #5 Arizona State`, `(3) / #3 UCLA`.
- **Swimming:** a league match's place and points `1st place, 575.5 points`; the intrasquad `Cream & Crimson (Exh.)` is not listed.
- **Soccer:** one ESPN scoreboard per team.

Every rule was mutated, and every mutation fails `npm run test:indiana-module`.

## Athletes

Three per sport. **Profile cards:** Football (`athlete_profile_fallback_sports`): `scripts/athlete-evidence.mjs` (Oct 8) read all 106 football profile pages, and none publishes an athlete Instagram link. Every other sport publishes links on most profiles.

## Limitations

- **Waiting on publication:** Track & Field and Water Polo fill when iuhoosiers.com publishes the new seasons.
- **Golf field size:** not published on the schedule (place only).
- **Live cards:** no live card observed yet (women's soccer at UCLA and volleyball vs Nebraska Oct 8).
