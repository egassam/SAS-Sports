# Texas A&M school module

`src/schools/texas-am.mjs` owns Texas A&M's 12thman.com schedule and roster routes, its program combinations, its verified Instagram identities and its schedule-card reader. The Worker imports its configuration. The event/result contract, caching, display and generic parsing stay shared.

Texas A&M was added to the app and converted on October 8, 2026, together with Texas. All 12 sports were converted and tested one at a time and published in one PR (#252). 12thman.com is WMT (Nuxt); the module is Missouri's card reader, copied with `scripts/port-handlers.mjs`, adapted to A&M's newer cards. Swimming & Diving (`swimdive`) is not in the nav's `/schedule` links and was added by hand.

## Status (`4.64.1-texas-texas-am`)

| Sport | Page | State |
| --- | --- | --- |
| Football | `football` | 5 finals, each with its story; 3-2 (SEC 1-2) as published; ESPN live score |
| Volleyball | `volleyball` | 16 finals and the Baylor exhibition, each with its story; 10-6 (3-1) as published; ESPN live score |
| Soccer | `soccer` | 12 finals and 2 exhibitions, each with its story; 4-8 (0-5) as published; ESPN live score |
| Cross Country | `cross-country` | 3 finals with both teams' places and points from TFRRS (`TX_college_f_Texas_AM`, `TX_college_m_Texas_AM`) |
| Golf | `mens-golf`, `womens-golf` | Labeled. Place from the final story's headline (runner-up x3); Fighting Irish Classic's story from the archive; Fighting Illini and Red Sky show "Completed" with their stories (headlines give no place) |
| Equestrian | `equestrian` | 2 finals with their story |
| Tennis | `mens-tennis`, `womens-tennis` | Labeled; ITA Regionals in progress |
| Basketball | `mens-basketball`, `womens-basketball` | Labeled; upcoming; ESPN live scores |
| Baseball, Softball | `baseball`, `softball` | 2027 seasons; fall games exhibitions; ESPN live scores |
| Swimming & Diving | `swimdive` | One page for both teams; upcoming |
| Track & Field | `track-and-field` | The page still lists 2025-26; fills when published |

## Texas A&M rules (beyond Missouri's)

- **Cards:** `schedule-event-default__*` (Missouri's are `schedule-default-event__*`); the date box is the card's top row; the opponent's name is its own `strong`.
- **Venue:** a home or neutral card has no divider; the date box's `schedule-event-date--venue-home|away|neutral` gives it.
- **Rankings** in brackets: `(#21) Baylor`. **Results** `W, Win 3-1`.
- **Event names:** "Opener" and "Challenge" are events (`Aggie Opener` is "at").
- **Golf:** a past tournament whose card links no story takes the archive story dated its last day or the two after whose headline names it; one still without a story leaves the feed (the individuals' Bayou City Classic). Places from "Runner-Up Finish" and "Aggies Finish Second". A tournament named for two sponsors (`OFCC/Fighting Illini Invitational`) is matched by its last part.

Each rule was mutated, and every mutation fails `npm run test:texas-am-module`.

## Athletes

Certification lists 10 sports (minimum 3). Baseball's roster page is the "2027 Baseball Roster" and Track & Field's the "2026-27" roster, both with no players: featuring last season's roster would show players who have left, so the two sports have no featured athletes until A&M publishes them (Arizona's precedent; no code change needed). A shared fix came from these pages: their link to the last season's roster (`/roster/season/2026`, "Roster for Baseball") had been read as an athlete. Equestrian (11 of 42 profiles), Golf (6 of 21), Softball (11 of 27), Swimming & Diving (8 of 52) and Tennis (3 of 23) are pinned in `verifiedInstagrams`.

## Limitations

- Baseball and Track & Field athletes when the 2026-27 rosters list players; Track & Field's schedule when 2026-27 is published.
- Two golf finals show "Completed" (their stories' headlines give no place).
- No live card observed yet.
