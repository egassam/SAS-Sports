# Alabama school module

`src/schools/alabama.mjs` owns Alabama's rolltide.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Alabama was converted on October 7, 2026, together with Florida (user: "Let's try two schools at once. Move to Sec and do Alabama and Florida"), the first SEC schools. All 13 sports were converted and tested one at a time, then published with Florida's in one PR (#242). The module is West Virginia's reader (copied from `const HOST=` down) with Alabama's routes and the rules below. Fixtures are the official pages, unmodified (`scripts/fetch-school-fixtures.mjs`; the `xctrack` page through the private source route).

## Status (`4.60.0-alabama-florida`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; record 5-0 (SEC 3-0) as published; ESPN live score |
| Volleyball | `womens-volleyball` | 13 finals, each with its story; 8-5 (0-4) as published; ESPN live score |
| Soccer | `womens-soccer` | 14 finals (the LSU exhibition labeled, out of the record), each with its story; 12-1 (5-0) as published; ESPN live score |
| Cross Country | `xctrack` | Shared page with track; entries named "Cross Country". 3 finals with both teams' places and points, confirmed by TFRRS (`AL_college_f_Alabama`, `AL_college_m_Alabama`) |
| Track & Field | `xctrack` | Entries named "Indoor/Outdoor Track & Field": 21 upcoming meets from Dec 4 |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; exhibitions labeled; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | Fall exhibitions labeled ("(DH)" kept as published), spring games; ESPN live scores |
| Golf | `mens-golf`, `womens-golf` | Labeled; one event per tournament with its last round's place and team score (`5th`, team score `844 (284-279-281)`), each with its story |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled; tournaments, each with its story |
| Swimming & Diving | `swimming-and-diving` | One page for both teams. Delta State dual per team (`Women's team: W, 253-33 / Men's team: W, 248-41`); College Swimming League match place (`3rd · 263 pts`) |
| Gymnastics | `womens-gymnastics` | 2027 season, upcoming meets |
| Rowing | `womens-rowing` | The page still lists 2025-26: no current events (fills when published) |

## Alabama rules (beyond West Virginia's)

- Cross country and track share `/sports/xctrack/schedule`; each entry's season (`tournament`) decides the sport. The `/schedule/text` route production used is not a page the reader accepts (it was read by the shared parsers, with "Upcoming" finals).
- Team places written `Women (3rd, 98 pts.) Men (3rd, 103 pts.)`.
- Golf: `5th (284-279-281/844)` reads place `5th` with team score `844 (284-279-281)` (no field size is published).
- Swimming: a dual written per team; the outcome comes from the scores (the page wrote "Men: M, 248-41" for a win). A league match place `3rd place - 263.0 points`. A "League" event reads `at`.
- NCAA postseason events read `at` (shared with Florida).

Each rule was mutated and every mutation fails `npm run test:alabama-module`.

## Athletes

Certification lists all 13 sports (minimum 3). Instagram is verified for Cross Country, Football, Soccer (profile-card fallback since September), Softball, Track & Field, Volleyball. Seven sports publish too few links and use official profile cards (`athlete_profile_fallback_sports`), with this evidence (October 7, every roster and every athlete profile page read, 262 profile pages):

- Baseball (45 profiles), men's and women's Golf (11, 8), Gymnastics (22), Rowing (62), men's and women's Tennis (12, 9): no athlete Instagram on any roster card or profile page.
- Basketball: one athlete link (Naomi Jones, `big1nom`, roster card and profile); the other link on the women's roster belongs to the head coach.
- Swimming & Diving: one athlete link (Emily Jones, `em.jones03`).
- The official team accounts' tags cannot be read (Instagram requires login), as for TCU Triathlon.
- Cross Country (October 8): Cross Country and Track & Field share one roster, and Cross Country now features distance runners only (user: "Texas is showing track athletes instead of cross country athletes"). Of the 84 profile pages, three publish an athlete Instagram: Meriel Rowland and Lilly Walters (distance) and John Landers ("Multi", not a distance runner). The third Cross Country slot is an official profile card.

## Limitations

- Golf headlines show the place without field size (not published on the schedule).
- Rowing: the page has not published 2026-27.
- No finals yet for Basketball, Baseball, Softball, Gymnastics, Track & Field; no Alabama game observed live under the module yet (volleyball vs South Carolina Oct 9, soccer at Florida Oct 8).
