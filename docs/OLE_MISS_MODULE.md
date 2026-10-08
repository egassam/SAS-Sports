# Ole Miss school module

`src/schools/ole-miss.mjs` owns Ole Miss's olemisssports.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Ole Miss was added to the app and converted on October 7-8, 2026, together with Mississippi State (user: "Let's do Mississippi and Mississippi State. Use what you have learned and optimize from what you learn this time"). All 11 sports were converted and tested one at a time and published in one PR. The module is Georgia's reader (copied from `const HOST=` down by script) with Ole Miss's routes and the rules below. olemisssports.com refuses the sandbox (HTTP 403), so fixtures came through the private source route; they are the official pages, unmodified.

## Status (`4.62.0-ole-miss-mississippi-state`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 4 finals, each with its story; record 3-1 (SEC 1-1) as published; ESPN live score |
| Volleyball | `womens-volleyball` | 14 finals, each with its story; 8-6 (2-1) as published; ESPN live score |
| Soccer | `womens-soccer` | 13 finals, each with its story; 7-6 (0-5) as published; ESPN live score |
| Cross Country | `cross-country` | 2 finals with both teams' places and points, confirmed by TFRRS (`MS_college_f_Mississippi`, `MS_college_m_Mississippi`) |
| Golf | `mens-golf`, `womens-golf` | Labeled. One event per tournament with place in the field and team score (`17th of 18`, `901 (+49)`); finals take their story from the schedule or the archive |
| Rifle | `womens-rifle` | Each opponent of a tri-meet is its own match (`W, 4711-4597`), with the shared story |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled. Tournaments read `No Team Scores` with their story; one without a story is left out of the feed |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled. Upcoming; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | 2027 spring season; ESPN live scores |
| Track & Field | `track-and-field` | The page still lists 2025-26; the July USATF Championships entry (with its story) is the only one in this academic year |

## Ole Miss rules (beyond Georgia's)

- **Golf result:** place in the field, then the team score to par, in two fields (`17th/18 --` and `901 (+49)`) or one (`2nd/16--859 (-5)`).
- **Cancelled last round:** a round whose no-play note is `Canceled` (The Ally, Oct 7) keeps the round before's place and ends the tournament that day.
- **Golf archive stories:** a final whose last round links another tournament's story (Boilermaker Classic links the Cougar Classic's) takes the archive's final story. A story dated before the last round ("second entering final round") is not accepted, so The Ally waits for its own story.
- **Routes:** rifle is `womens-rifle`; the scaffold's `rifle` and other candidates were SIDEARM's empty template and were dropped, as was the homepage.

Each rule was mutated, and every mutation fails `npm run test:ole-miss-module`.

## Athletes

Certification lists all 11 sports (minimum 3). On October 7 every roster and profile page was read through the private source (`scripts/athlete-evidence.mjs`, 427 pages). Basketball, Football, Golf, Rifle, Soccer and Tennis publish many athlete links. Baseball (3 of 42 profiles) and Track & Field (4 of 88) publish few, so those athletes are pinned in `verifiedInstagrams`, as are Volleyball's 2 of 18 and Softball's 1 of 26.

Three sports use official profile cards (`athlete_profile_fallback_sports`): Cross Country (0 of 30 profiles publish a link), Softball (1) and Volleyball (2). Team-account tags could not be read: instagram.com answers the sandbox with its login page.

## Limitations

- The Ally (women's golf, Oct 5-7) has no final story yet; it shows `2nd of 17` and takes the story when Ole Miss publishes it.
- Track & Field, Baseball, Softball and Basketball fill as their seasons start or are published.
- No live card observed yet.
