# Florida school module

`src/schools/florida.mjs` owns Florida's floridagators.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Florida was converted on October 7, 2026, together with Alabama (user: "Let's try two schools at once. Move to Sec and do Alabama and Florida"). All 13 sports were converted and tested one at a time, then published with Alabama's in one PR (#242). The module is West Virginia's reader with Florida's routes and the rules below. Fixtures are the official pages, unmodified (the swimming pages through the private source route: floridagators.com answers the sandbox with a "Loading" page).

## Status (`4.60.0-alabama-florida`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; record 4-1 (SEC 2-1) as published; ESPN live score |
| Volleyball | `womens-volleyball` | 13 finals, each with its story; 12-1 (3-0) as published; ESPN live score |
| Soccer | `womens-soccer` | 13 finals (the FIU exhibition labeled, out of the record), each with its story; 5-4-3 (1-2-2) as published; ESPN live score |
| Cross Country | `cross-country` | 2 finals with both teams' places and points, confirmed by TFRRS (`FL_college_f_Florida`, `FL_college_m_Florida`) |
| Track & Field | `track-and-field` | The page lists 2026; one final this season (USATF Outdoor Championships, Jul 23-26, with its story) |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | Spring 2027 games (NCAA postseason events read `at`); ESPN live scores |
| Golf | `mens-golf`, `womens-golf` | Labeled; place and field with score to par (`T5th of 15`, to par `-27`), each with its story |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled; past tournaments take their story from the archive (the schedule links none) |
| Swimming & Diving | `mens-swimming-and-diving`, `womens-swimming-and-diving` | Labeled; dual scores, each with its story |
| Gymnastics | `womens-gymnastics` | 2027 season, upcoming meets |
| Lacrosse | `womens-lacrosse` | The page lists the 2026 spring season: no current events (fills when published) |

## Florida rules (beyond West Virginia's)

- A tied ranking (`#T3 Florida State`) is dropped like any other ranking.
- Golf: `T5/15 | (-27)` reads `T5th of 15` with the score to par.
- NCAA postseason events read `at` (NCAA Regionals at home).
- Tennis tournaments are meets: a past one takes its story from the sport's archive (Princeton Invite: the Farnsworth Invitational story the event page links) and is listed only with one (feed hook in `src/index.js`, as K-State lists tennis).
- The saved Florida State-sourced detail for the Aug 23 soccer game was removed: Florida's own story is now found.

Each rule was mutated and every mutation fails `npm run test:florida-module`.

## Athletes

Certification lists all 13 sports (minimum 3); every sport shows three verified Instagram athletes. Track & Field's third comes from the cross country runners already verified from the official team account (Allaoui, Edwards, Stegall), who are on the official track roster.

## Limitations

- Lacrosse: the page has not published 2027.
- No finals yet for Basketball, Baseball, Softball, Gymnastics; no Florida game observed live under the module yet (soccer vs Alabama Oct 8).
